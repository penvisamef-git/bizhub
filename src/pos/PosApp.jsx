import { useEffect } from "react";
import "./pos.css";
import "./restthemes.css";
import { applyRestPosLook } from "./restThemes";
import { usePosText } from "./text";
import { init, openShift, usePos } from "./engine";
import { NoSetup, OpenShift, Pair, PinLock, Splash } from "./screens/Start";
import Main from "./screens/Main";
import { ShiftDone } from "./screens/CloseShift";
import { startDisplayFeed } from "./display";
import { PreviewHost, PrintHost } from "./screens/Print";

// keep the POS working with no internet: the browser saves its files the first time it opens
function registerOffline() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker
    .register("/pos-sw.js", { scope: "/pos" })
    .then(async (reg) => {
      await navigator.serviceWorker.ready;
      // the files this page already loaded (scripts, styles, fonts) → saved for offline use
      const urls = [...new Set([location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name), ...[...document.querySelectorAll("script[src],link[rel=stylesheet]")].map((el) => el.src || el.href)])].filter(
        (u) => !u.includes("/api/"),
      );
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "cache", urls });
    })
    .catch(() => {});
}

export default function PosApp() {
  const s = usePos();
  const { t } = usePosText();
  useEffect(() => {
    document.title = "BizHub POS";
    document.body.classList.add("pos-body-page");
    init().then(startDisplayFeed);
    registerOffline();
    return () => document.body.classList.remove("pos-body-page");
  }, []);

  // the POS look the owner picked (rest_pos_theme): colours, shapes and font on the whole page
  const look = s.setup?.pos_theme || "classic";
  useEffect(() => {
    applyRestPosLook(look);
    return () => applyRestPosLook("classic");
  }, [look]);

  let screen;
  if (s.phase === "loading") screen = <Splash text={t.loading} />;
  else if (s.phase === "pair") screen = <Pair />;
  else if (s.phase === "nosetup") screen = <NoSetup />;
  else if (s.shiftDone) screen = <ShiftDone />;
  else if (!s.staff) screen = <PinLock />;
  else if (!openShift(s)) screen = <OpenShift />;
  else screen = <Main />;
  return (
    <>
      {screen}
      <PrintHost />
      <PreviewHost />
    </>
  );
}
