import { useEffect, useRef, useState } from "react";
import { posApi } from "./api";
import { CHANNEL } from "./display";
import { DisplayView } from "./DisplayView";

const KEY = "bizhub_display_key";
const POLL_MS = 1500;

// The screen facing the guest: welcome → their order and total → thank you (+ change).
//   /pos/restaurant/display            same computer as the POS (second window / monitor), instant, offline OK
//   /pos/restaurant/display?key=…      another tablet, reads the POS's picture from the cloud
export default function CustomerDisplay() {
  const [pic, setPic] = useState(null);
  const [online, setOnline] = useState(true);
  const [showFs, setShowFs] = useState(true);
  const hideTimer = useRef(null);

  useEffect(() => {
    document.title = "BizHub · Display";
    document.body.classList.add("gd-body");
    const fromUrl = new URLSearchParams(location.search).get("key");
    // a tablet opened once with ?key= keeps it (so a reload still works)
    let key = fromUrl || "";
    try {
      if (fromUrl) localStorage.setItem(KEY, fromUrl);
      else if (window.name !== "bizhub-display") key = localStorage.getItem(KEY) || "";
    } catch {
      /* private mode */
    }
    let stop = () => {};
    if (key) {
      // another tablet: ask the cloud every 1.5 s
      let alive = true;
      const tick = async () => {
        try {
          const data = await posApi.displayGet(key);
          if (!alive) return;
          setOnline(true);
          if (data.state) setPic(data.state);
        } catch {
          if (alive) setOnline(false);
        }
        if (alive) setTimeout(tick, POLL_MS);
      };
      tick();
      stop = () => (alive = false);
    } else if (typeof BroadcastChannel !== "undefined") {
      // same computer: the POS window talks to this one directly
      const ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = (e) => e.data?.v && setPic(e.data);
      ch.postMessage({ type: "hello" });
      const again = setInterval(() => ch.postMessage({ type: "hello" }), 5000);
      stop = () => {
        clearInterval(again);
        ch.close();
      };
    }
    return () => {
      stop();
      document.body.classList.remove("gd-body");
    };
  }, []);

  // the full-screen button hides when the mouse rests
  const poke = () => {
    setShowFs(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowFs(false), 3000);
  };
  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, []);

  return <DisplayView pic={pic} online={online} showFs={showFs} poke={poke} />;
}

