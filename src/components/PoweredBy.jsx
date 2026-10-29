// "Powered by Cyber Tech System" (v3.3.0): the company behind BizHub, at the bottom of BizHub's own screens and next to
// the "Made with BizHub" badge on customers' pages (where a customer bought "no BizHub name", neither is shown).
// The name and link are in Super admin → Homepage settings (powered_by); until they load (or offline) the default.
// The BizHub apps say the same (bizhub-app / bizhub-app-pos: lib/…/powered_by.dart).
//   <PoweredBy />  ·  <PoweredBy lang="km" className="x" />  ·  <PoweredBy value={settings.powered_by} /> (homepage)
import { useEffect, useState } from "react";
import { publicGet } from "../api/client";
import { useI18n } from "../i18n/I18nProvider";
import "./poweredby.css";

export const POWERED_DEFAULT = { name: "Cyber Tech System", url: "https://ctscambodia.com/", on: true };
const WORD = { en: "Powered by", km: "ដំណើរការដោយ" };

// asked once per page load, shared by every line on the page
let cache = null;
let asking = null;
function usePowered(value) {
  const [v, setV] = useState(value || cache || POWERED_DEFAULT);
  useEffect(() => {
    if (value) return setV({ ...POWERED_DEFAULT, ...value });
    if (cache) return setV(cache);
    let alive = true;
    asking =
      asking ||
      publicGet("/homepage")
        .then((r) => (cache = { ...POWERED_DEFAULT, ...(r.data?.powered_by || {}) }))
        .catch(() => POWERED_DEFAULT);
    asking.then((x) => alive && setV(x));
    return () => {
      alive = false;
    };
  }, [value]);
  return v;
}

export default function PoweredBy({ lang, value, className = "", as: Tag = "p" }) {
  const i18n = useI18n();
  const l = lang || i18n.lang;
  const p = usePowered(value);
  if (p.on === false || !p.name) return null;
  const name = /^https?:\/\//.test(p.url || "") ? (
    <a href={p.url} target="_blank" rel="noopener noreferrer" data-testid="powered-by-link">
      {p.name}
    </a>
  ) : (
    <b>{p.name}</b>
  );
  return (
    <Tag className={`powered-by ${className}`} data-testid="powered-by">
      {WORD[l] || WORD.en} {name}
    </Tag>
  );
}
