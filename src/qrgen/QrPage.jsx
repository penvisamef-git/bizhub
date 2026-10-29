import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Copy, Download, ExternalLink, FileText, Globe, Loader2, Lock, Mail, MapPin, MessageSquare, Phone, QrCode, Send, UserPlus, Wifi, Camera, Star, Ticket } from "lucide-react";
import { PUBLIC_API_BASE, publicGet, publicPost } from "../api/client";
import "./qrpage.css";
import "./qpthemes.css";
import { themeOf } from "./themes";
import { LINK_META, linkHref } from "./linkKinds";
import { qrSvg } from "../dashboard/client/menuqr/qrArt";
import PoweredBy from "../components/PoweredBy";

const TEXT = {
  km: {
    opening: "កំពុងបើក…",
    open: "បើកតំណ",
    offTitle: "QR នេះមិនមានទេ",
    offSub: "QR នេះមិនមាន ឬត្រូវបានផ្អាកបណ្តោះអាសន្ន។",
    expired: "QR នេះផុតកំណត់ហើយ",
    limit: "QR នេះត្រូវបានស្កេនគ្រប់ចំនួនហើយ",
    blockedSub: "សូមទាក់ទងម្ចាស់ QR នេះ។",
    pwTitle: "QR នេះមានពាក្យសម្ងាត់",
    pw: "ពាក្យសម្ងាត់",
    unlock: "បើក",
    wrong: "ពាក្យសម្ងាត់មិនត្រឹមត្រូវ!",
    openPdf: "បើក PDF",
    noFile: "មិនទាន់មានឯកសារនៅឡើយ។",
    download: "ទាញយក",
    send: "ផ្ញើ",
    thanks: "អរគុណ!",
    thanksSub: "យើងបានទទួលព័ត៌មានរបស់អ្នកហើយ។",
    again: "ផ្ញើម្តងទៀត",
    choose: "ជ្រើសរើស…",
    required: "សូមបំពេញ",
    formOff: "ទម្រង់នេះមិនទាន់បើកទេ។",
    call: "ហៅទូរស័ព្ទ",
    sms: "ផ្ញើសារ",
    email: "អ៊ីមែល",
    website: "វេបសាយ",
    save: "រក្សាទុកលេខទំនាក់ទំនង",
    map: "បើកក្នុង Google Maps",
    network: "ឈ្មោះ Wi-Fi",
    password: "ពាក្យសម្ងាត់",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    wifiHint: "បើកកាមេរ៉ាទូរស័ព្ទ ស្កេនកូដ QR ដើម្បីភ្ជាប់ដោយស្វ័យប្រវត្តិ ឬវាយពាក្យសម្ងាត់ខាងលើ។",
    made: "បង្កើតដោយ BizHub",
    change: "ប្តូររូប",
    addPhoto: "ថតរូប ឬជ្រើសរូបភាព",
    uploading: "កំពុងផ្ទុកឡើង…",
    signHere: "ចុះហត្ថលេខាក្នុងប្រអប់ខាងលើ",
    signDone: "រួចរាល់",
    signAgain: "ចុះហត្ថលេខាម្តងទៀត",
    clear: "លុប",
    getCoupon: "យកគូប៉ុងរបស់ខ្ញុំ",
    showStaff: "បង្ហាញលេខនេះដល់បុគ្គលិក",
    couponUsed: "បានប្រើរួចហើយ",
    couponGone: "គូប៉ុងអស់ហើយ",
    couponEnded: "គូប៉ុងនេះផុតកំណត់ហើយ",
    validUntil: "ប្រើបានដល់ {date}",
    left: "នៅសល់ {n}",
    couponGood: "គូប៉ុងនេះអាចប្រើបាន",
    staffPin: "PIN បុគ្គលិក",
    markUsed: "សម្គាល់ថាបានប្រើ",
    redeemOk: "រួចរាល់ — បានសម្គាល់ថាប្រើហើយ",
  },
  en: {
    opening: "Opening…",
    open: "Open link",
    offTitle: "QR code not available",
    offSub: "This QR code doesn't exist or is paused for now.",
    expired: "This QR code has ended",
    limit: "This QR code reached its scan limit",
    blockedSub: "Please contact the owner of this QR code.",
    pwTitle: "This QR code has a password",
    pw: "Password",
    unlock: "Open",
    wrong: "Wrong password.",
    openPdf: "Open PDF",
    noFile: "No file has been added yet.",
    download: "Download",
    send: "Send",
    thanks: "Thank you!",
    thanksSub: "We got your answers.",
    again: "Send another",
    choose: "Choose…",
    required: "Please fill in",
    formOff: "This form is not open yet.",
    call: "Call",
    sms: "Send SMS",
    email: "Email",
    website: "Website",
    save: "Save contact",
    map: "Open in Google Maps",
    network: "Wi-Fi name",
    password: "Password",
    copy: "Copy",
    copied: "Copied",
    wifiHint: "Open your phone camera and scan the QR code to join automatically, or type the password above.",
    made: "Made with BizHub",
    change: "Change photo",
    addPhoto: "Take or choose a photo",
    uploading: "Uploading…",
    signHere: "Sign in the box above",
    signDone: "Done",
    signAgain: "Sign again",
    clear: "Clear",
    getCoupon: "Get my coupon",
    showStaff: "Show this code to the staff",
    couponUsed: "Already used",
    couponGone: "All coupons are gone",
    couponEnded: "This coupon has ended",
    validUntil: "Valid until {date}",
    left: "{n} left",
    couponGood: "This coupon is good to use",
    staffPin: "Staff PIN",
    markUsed: "Mark as used",
    redeemOk: "Done — marked as used",
  },
};
const startLang = () => {
  try {
    const v = localStorage.getItem("qg-lang");
    if (v === "km" || v === "en") return v;
  } catch {
    /* private window */
  }
  return (navigator.language || "").startsWith("en") ? "en" : "km";
};
const web = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const linkify = (s) =>
  String(s || "")
    .split(/(https?:\/\/[^\s]+)/g)
    .map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      ) : (
        part
      ),
    );

function vcf(v) {
  const e = (s) => String(s || "").replace(/([,;\\])/g, "\\$1");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${e(v.name)}`,
    `N:${e(v.name)};;;;`,
    v.org ? `ORG:${e(v.org)}` : "",
    v.job ? `TITLE:${e(v.job)}` : "",
    v.phone ? `TEL;TYPE=CELL:${v.phone}` : "",
    v.phone2 ? `TEL;TYPE=WORK:${v.phone2}` : "",
    v.email ? `EMAIL:${v.email}` : "",
    v.website ? `URL:${web(v.website)}` : "",
    v.address ? `ADR:;;${e(v.address)};;;;` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}

// /x/:slug — what people see after scanning a BizHub QR code
export default function QrPage({ preview: pv = null, lang: forceLang }) {
  const { slug } = useParams();
  const [data, setData] = useState(pv);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState(() => forceLang || startLang());
  const t = TEXT[lang];
  const tokenKey = `qg-t-${slug}`;
  const load = () => {
    let tok = "";
    try {
      tok = sessionStorage.getItem(tokenKey) || "";
    } catch {
      /* private window */
    }
    return publicGet(`/qr/${encodeURIComponent(slug)}${tok ? `?t=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => {
        setData(r.data);
        setError(null);
        document.title = r.data.page?.header || r.data.name || r.data.business;
        if (r.data.type === "url" && r.data.url) window.location.replace(r.data.url);
      })
      .catch((e) => setError(e));
  };
  useEffect(() => {
    if (pv) setData(pv);
  }, [pv]);
  useEffect(() => {
    if (!pv) load();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (forceLang) setLang(forceLang);
  }, [forceLang]);
  if (error)
    return (
      <div className="qp qp-plain">
        <div className="qp-off">
          <QrCode size={46} />
          <h1>{t.offTitle}</h1>
          <p>{t.offSub}</p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="qp qp-plain">
        <div className="qp-off">
          <Loader2 size={30} className="qp-spin" />
        </div>
      </div>
    );
  const p = data.page || {};
  const theme = themeOf(p.template);
  const tpl = theme ? theme.base : ["card", "banner", "minimal"].includes(p.template) ? p.template : "card";
  let body;
  if (data.blocked) body = <Blocked t={t} kind={data.blocked} />;
  else if (data.locked) body = <Unlock t={t} slug={slug} onOpen={(tok) => (sessionStorage.setItem(tokenKey, tok), load())} />;
  else if (data.type === "url")
    body = (
      <div className="qp-center">
        <Loader2 size={26} className="qp-spin" />
        <p>{t.opening}</p>
        {data.url && (
          <a className="qp-btn" href={data.url} data-testid="qp-open">
            <ExternalLink size={16} /> {t.open}
          </a>
        )}
      </div>
    );
  else body = <Content data={data} t={t} slug={slug} preview={!!pv} lang={lang} />;
  return (
    <div className={`qp qp-${tpl} ${theme ? `th-${theme.key}${theme.dark ? " qp-dark" : ""}` : ""} ${pv ? "qp-preview" : ""}`} style={{ "--q": p.color || "#E0581A" }} data-testid="qp">
      {!forceLang && (
        <div className="qp-lang">
          {["km", "en"].map((l) => (
            <button
              key={l}
              type="button"
              className={lang === l ? "on" : ""}
              onClick={() => {
                setLang(l);
                try {
                  localStorage.setItem("qg-lang", l);
                } catch {
                  /* private window */
                }
              }}
            >
              {l === "km" ? "ខ្មែរ" : "EN"}
            </button>
          ))}
        </div>
      )}
      <div className="qp-sheet">
        <header className="qp-head">
          {data.logo ? <img className="qp-logo" src={data.logo} alt="" /> : <span className="qp-logo qp-logo-x">{(data.business || "Q").slice(0, 1)}</span>}
          <div className="qp-head-text">
            <small>{data.business}</small>
            <h1>{p.header || data.name}</h1>
          </div>
        </header>
        <main className="qp-main">
          {body}
          {!data.blocked && !data.locked && p.rows?.length > 0 && (
            <dl className="qp-rows">
              {p.rows.map((r, i) => (
                <div key={i}>
                  <dt>{r.label}</dt>
                  <dd>{linkify(r.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </main>
        {p.footer && <footer className="qp-foot">{p.footer}</footer>}
      </div>
      {data.brand !== false && (
        <>
          <a className="qp-made" href={pv ? undefined : "/"} target="_blank" rel="noreferrer">
            {t.made}
          </a>
          <PoweredBy lang={lang} className="qp-powered" />
        </>
      )}
    </div>
  );
}

function Blocked({ t, kind }) {
  return (
    <div className="qp-center">
      <Lock size={30} />
      <h2>{kind === "expired" ? t.expired : t.limit}</h2>
      <p>{t.blockedSub}</p>
    </div>
  );
}

function Unlock({ t, slug, onOpen }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="qp-center"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          const r = await publicPost(`/qr/${encodeURIComponent(slug)}/unlock`, { password: pw });
          onOpen(r.data.token);
        } catch (x) {
          setErr(x.body?.code === "wrong_password" ? t.wrong : x.message);
          setBusy(false);
        }
      }}
    >
      <Lock size={30} />
      <h2>{t.pwTitle}</h2>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t.pw} autoFocus data-testid="qp-pw" />
      {err && <div className="qp-err">{err}</div>}
      <button type="submit" className="qp-btn" disabled={busy || !pw} data-testid="qp-pw-open">
        {busy ? <Loader2 size={16} className="qp-spin" /> : <Lock size={16} />} {t.unlock}
      </button>
    </form>
  );
}

function CopyRow({ label, value, t, secret }) {
  const [done, setDone] = useState(false);
  return (
    <div className="qp-copy">
      <small>{label}</small>
      <div>
        <b>{secret && !value ? "—" : value}</b>
        {value && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(value).catch(() => {});
              setDone(true);
              setTimeout(() => setDone(false), 1400);
            }}
          >
            {done ? <Check size={15} /> : <Copy size={15} />} {done ? t.copied : t.copy}
          </button>
        )}
      </div>
    </div>
  );
}

function Content({ data, t, slug, preview, lang }) {
  if (data.text)
    return (
      <article className="qp-text">
        {data.text.title && <h2>{data.text.title}</h2>}
        <p>{linkify(data.text.body)}</p>
      </article>
    );
  if (data.file) {
    const f = data.file;
    if (!f.has && !f.url)
      return (
        <div className="qp-file">
          <div className="qp-pdf">
            <FileText size={40} />
            <b>{t.noFile}</b>
          </div>
        </div>
      );
    let tok = "";
    try {
      tok = sessionStorage.getItem(`qg-t-${slug}`) || "";
    } catch {
      /* private mode */
    }
    const link = (dl) => (preview ? undefined : `${PUBLIC_API_BASE}/qr/${encodeURIComponent(slug)}/file?${new URLSearchParams({ ...(tok ? { t: tok } : {}), ...(dl ? { dl: "1" } : {}) })}`);
    return (
      <div className="qp-file">
        {f.kind === "image" ? (
          <img src={f.url} alt={f.name} />
        ) : (
          <div className="qp-pdf">
            <FileText size={40} />
            <b>{f.name || "PDF"}</b>
            {f.bytes ? <small>{(f.bytes / 1048576).toFixed(1)} MB</small> : null}
          </div>
        )}
        <div className="qp-btns">
          {f.kind !== "image" && (
            <a className="qp-btn" href={link(false)} target="_blank" rel="noreferrer" data-testid="qp-file-open">
              <ExternalLink size={16} /> {t.openPdf}
            </a>
          )}
          <a className="qp-btn ghost" href={link(true)} rel="noreferrer" data-testid="qp-file-download">
            <Download size={16} /> {t.download}
          </a>
        </div>
      </div>
    );
  }
  if (data.links) return <LinksView links={data.links} />;
  if (data.coupon) return <CouponView coupon={data.coupon} slug={slug} t={t} lang={lang} preview={preview} />;
  if (data.form) return <FormView form={data.form} t={t} slug={slug} preview={preview} />;
  if (data.form_off) return <div className="qp-center">{t.formOff}</div>;
  if (data.vcard) {
    const v = data.vcard;
    const save = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([vcf(v)], { type: "text/vcard" }));
      a.download = `${(v.name || "contact").replace(/[^\p{L}\p{N} ]+/gu, "")}.vcf`;
      a.click();
    };
    return (
      <div className="qp-vcard">
        <div className="qp-avatar">{(v.name || "?").slice(0, 1)}</div>
        <h2>{v.name}</h2>
        {(v.job || v.org) && <p>{[v.job, v.org].filter(Boolean).join(" · ")}</p>}
        <div className="qp-actions">
          {v.phone && (
            <a href={`tel:${v.phone.replace(/[^+\d]/g, "")}`}>
              <Phone size={18} />
              <span>{t.call}</span>
            </a>
          )}
          {v.email && (
            <a href={`mailto:${v.email}`}>
              <Mail size={18} />
              <span>{t.email}</span>
            </a>
          )}
          {v.website && (
            <a href={web(v.website)} target="_blank" rel="noreferrer">
              <Globe size={18} />
              <span>{t.website}</span>
            </a>
          )}
        </div>
        <ul className="qp-list">
          {v.phone && (
            <li>
              <Phone size={15} /> {v.phone}
            </li>
          )}
          {v.phone2 && (
            <li>
              <Phone size={15} /> {v.phone2}
            </li>
          )}
          {v.email && (
            <li>
              <Mail size={15} /> {v.email}
            </li>
          )}
          {v.address && (
            <li>
              <MapPin size={15} /> {v.address}
            </li>
          )}
        </ul>
        <button type="button" className="qp-btn" onClick={() => !preview && save()} data-testid="qp-save-contact">
          <UserPlus size={16} /> {t.save}
        </button>
      </div>
    );
  }
  if (data.map) {
    const m = data.map;
    const q = m.place || "";
    const link = m.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    return (
      <div className="qp-map">
        {q && <iframe title="map" src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`} loading="lazy" />}
        <h2>
          <MapPin size={18} /> {q}
        </h2>
        {m.note && <p>{m.note}</p>}
        <a className="qp-btn" href={preview ? undefined : link} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> {t.map}
        </a>
      </div>
    );
  }
  if (data.wifi) {
    const w = data.wifi;
    return (
      <div className="qp-wifi">
        <span className="qp-wifi-ic">
          <Wifi size={30} />
        </span>
        <CopyRow label={t.network} value={w.ssid} t={t} />
        {w.security !== "nopass" && <CopyRow label={t.password} value={w.password} t={t} secret />}
        <p className="qp-hint">{t.wifiHint}</p>
      </div>
    );
  }
  if (data.phone) {
    const n = String(data.phone.number || "").replace(/[^+\d]/g, "");
    return (
      <div className="qp-center">
        <b className="qp-big">{data.phone.number}</b>
        <div className="qp-btns">
          <a className="qp-btn" href={`tel:${n}`}>
            <Phone size={16} /> {t.call}
          </a>
          <a className="qp-btn ghost" href={`sms:${n}${data.phone.body ? `?body=${encodeURIComponent(data.phone.body)}` : ""}`}>
            <MessageSquare size={16} /> {t.sms}
          </a>
        </div>
      </div>
    );
  }
  return null;
}

const tokenOf = (slug) => {
  try {
    return sessionStorage.getItem(`qg-t-${slug}`) || "";
  } catch {
    return "";
  }
};
const store = {
  get(k) {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private window */
    }
  },
};
async function uploadPic(slug, blob, name = "photo.jpg") {
  const fd = new FormData();
  fd.append("photo", blob, name);
  const tok = tokenOf(slug);
  if (tok) fd.append("t", tok);
  const res = await fetch(`${PUBLIC_API_BASE}/qr/${encodeURIComponent(slug)}/upload`, { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || "Upload failed");
  return json.data.url;
}
// shrink a phone photo before upload (max 1600 px, JPEG)
const shrink = (file) =>
  new Promise((resolve) => {
    if (!/^image\//.test(file.type)) return resolve(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b || file), "image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
// is a field shown, given the answers so far (form extras: "show only if")
const visible = (f, v) => {
  if (!f.show_if?.key) return true;
  const other = v[f.show_if.key];
  return Array.isArray(other) ? other.includes(f.show_if.value) : f.show_if.value ? other === f.show_if.value : !!other;
};

function Stars({ value, onChange }) {
  return (
    <div className="qp-stars" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={Number(value) >= n ? "on" : ""} onClick={() => onChange(String(n))} aria-label={`${n}`} data-testid={`qp-star-${n}`}>
          <Star size={30} />
        </button>
      ))}
    </div>
  );
}

function PhotoInput({ slug, value, onChange, t, preview }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="qp-photo">
      {value ? (
        <div className="qp-photo-done">
          <img src={value} alt="" />
          <button type="button" className="qp-btn ghost" onClick={() => onChange("")}>
            {t.change}
          </button>
        </div>
      ) : (
        <label className={`qp-photo-pick ${busy ? "busy" : ""}`}>
          {busy ? <Loader2 size={22} className="qp-spin" /> : <Camera size={24} />}
          <span>{busy ? t.uploading : t.addPhoto}</span>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy || preview}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              setErr("");
              try {
                onChange(await uploadPic(slug, await shrink(file)));
              } catch (x) {
                setErr(x.message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
      {err && <small className="qp-err">{err}</small>}
    </div>
  );
}

function SignaturePad({ slug, value, onChange, t, preview }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    const c = ref.current;
    if (!c || value) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * 2;
    c.height = r.height * 2;
    const g = c.getContext("2d");
    g.scale(2, 2);
    g.lineWidth = 2.4;
    g.lineCap = "round";
    g.strokeStyle = "#111";
  }, [value]);
  const at = (e) => {
    const r = ref.current.getBoundingClientRect();
    const p = e.touches?.[0] || e;
    return [p.clientX - r.left, p.clientY - r.top];
  };
  const down = (e) => {
    if (preview) return;
    drawing.current = true;
    const g = ref.current.getContext("2d");
    g.beginPath();
    g.moveTo(...at(e));
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ref.current.getContext("2d");
    g.lineTo(...at(e));
    g.stroke();
    setDirty(true);
  };
  const up = () => (drawing.current = false);
  const clear = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };
  const done = () => {
    setBusy(true);
    setErr("");
    ref.current.toBlob(async (b) => {
      try {
        onChange(await uploadPic(slug, b, "signature.png"));
      } catch (x) {
        setErr(x.message);
      } finally {
        setBusy(false);
      }
    }, "image/png");
  };
  if (value)
    return (
      <div className="qp-photo-done sign">
        <img src={value} alt="" />
        <button type="button" className="qp-btn ghost" onClick={() => onChange("")}>
          {t.signAgain}
        </button>
      </div>
    );
  return (
    <div className="qp-sign">
      <canvas ref={ref} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up} data-testid="qp-sign" />
      <small>{t.signHere}</small>
      <div className="qp-sign-acts">
        <button type="button" className="qp-btn ghost" onClick={clear} disabled={!dirty || busy}>
          {t.clear}
        </button>
        <button type="button" className="qp-btn" onClick={done} disabled={!dirty || busy || preview} data-testid="qp-sign-done">
          {busy ? <Loader2 size={16} className="qp-spin" /> : <Check size={16} />} {t.signDone}
        </button>
      </div>
      {err && <small className="qp-err">{err}</small>}
    </div>
  );
}

function FormView({ form, t, slug, preview }) {
  const [v, setV] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null); // null = not sent yet; "" = sent (default thank-you)
  const set = (k, x) => setV((o) => ({ ...o, [k]: x }));
  if (done !== null)
    return (
      <div className="qp-center qp-thanks" data-testid="qp-thanks">
        <span className="qp-ok">
          <Check size={28} />
        </span>
        <h2>{t.thanks}</h2>
        <p>{done || t.thanksSub}</p>
        <button
          type="button"
          className="qp-btn ghost"
          onClick={() => {
            setV({});
            setDone(null);
          }}
        >
          {t.again}
        </button>
      </div>
    );
  const shown = (form.fields || []).filter((f) => visible(f, v));
  return (
    <form
      className="qp-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview) return;
        const miss = shown.find((f) => f.required && (Array.isArray(v[f.key]) ? !v[f.key].length : !String(v[f.key] || "").trim()));
        if (miss) return setErr(`${t.required}: ${miss.label}`);
        setBusy(true);
        setErr("");
        try {
          const answers = Object.fromEntries(shown.map((f) => [f.key, v[f.key]]).filter(([, x]) => x !== undefined));
          const r = await publicPost(`/qr/${encodeURIComponent(slug)}/reply`, { answers, t: tokenOf(slug) });
          setDone(r.data?.thanks || "");
        } catch (x) {
          setErr(x.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {form.title && <h2>{form.title}</h2>}
      {form.intro && <p className="qp-intro">{form.intro}</p>}
      {shown.map((f) => (
        <div key={f.key} className="qp-field" data-testid={`qp-field-${f.key}`}>
          <span>
            {f.label}
            {f.required && <i>*</i>}
          </span>
          {f.kind === "textarea" ? (
            <textarea rows={4} value={v[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} maxLength={3000} />
          ) : f.kind === "select" ? (
            <select value={v[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">{t.choose}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : f.kind === "checkbox" || f.kind === "radio" ? (
            <div className="qp-choices">
              {f.options.map((o) => {
                const on = f.kind === "checkbox" ? (v[f.key] || []).includes(o) : v[f.key] === o;
                return (
                  <button key={o} type="button" className={on ? "on" : ""} onClick={() => (f.kind === "checkbox" ? set(f.key, on ? (v[f.key] || []).filter((x) => x !== o) : [...(v[f.key] || []), o]) : set(f.key, o))}>
                    <i className={f.kind}>{on && <Check size={12} />}</i> {o}
                  </button>
                );
              })}
            </div>
          ) : f.kind === "rating" ? (
            <Stars value={v[f.key]} onChange={(x) => set(f.key, x)} />
          ) : f.kind === "photo" ? (
            <PhotoInput slug={slug} value={v[f.key] || ""} onChange={(x) => set(f.key, x)} t={t} preview={preview} />
          ) : f.kind === "signature" ? (
            <SignaturePad slug={slug} value={v[f.key] || ""} onChange={(x) => set(f.key, x)} t={t} preview={preview} />
          ) : (
            <input
              type={f.kind === "phone" ? "tel" : f.kind === "email" ? "email" : f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
              value={v[f.key] || ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              maxLength={500}
              data-testid={`qp-f-${f.key}`}
            />
          )}
        </div>
      ))}
      {err && <div className="qp-err">{err}</div>}
      <button type="submit" className="qp-btn" disabled={busy} data-testid="qp-send">
        {busy ? <Loader2 size={16} className="qp-spin" /> : <Send size={16} />} {form.button || t.send}
      </button>
    </form>
  );
}

// link page: one big button per link
function LinksView({ links }) {
  return (
    <div className="qp-links" data-testid="qp-links">
      {links.map((l, i) => {
        const meta = LINK_META[l.kind] || LINK_META.web;
        const Icon = meta.icon;
        return (
          <a key={i} className="qp-link" href={linkHref(l)} target={l.kind === "phone" || l.kind === "email" ? undefined : "_blank"} rel="noreferrer" style={{ "--lc": meta.color }}>
            <span className="qp-link-ic">
              <Icon size={19} />
            </span>
            <b>{l.label || meta.en}</b>
            <ExternalLink size={15} className="qp-link-go" />
          </a>
        );
      })}
    </div>
  );
}

// coupon: press to get a one-time code; staff scan its QR to mark it used
function CouponView({ coupon, slug, t, lang, preview }) {
  const key = `qg-cp-${slug}`;
  const [mine, setMine] = useState(() => {
    try {
      return JSON.parse(store.get(key) || "null");
    } catch {
      return null;
    }
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // refresh "used" state of my coupon
  useEffect(() => {
    if (!mine?.code || preview) return;
    publicGet(`/qr/${encodeURIComponent(slug)}/coupon/${mine.code}`)
      .then((r) => {
        if (r.data.used_at && !mine.used_at) {
          const next = { ...mine, used_at: r.data.used_at };
          setMine(next);
          store.set(key, JSON.stringify(next));
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const get = async () => {
    if (preview) return;
    setBusy(true);
    setErr("");
    try {
      let dev = store.get("qg-dev");
      if (!dev) {
        dev = `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`.slice(0, 40);
        store.set("qg-dev", dev);
      }
      const r = await publicPost(`/qr/${encodeURIComponent(slug)}/coupon`, { device: dev, t: tokenOf(slug) });
      setMine(r.data);
      store.set(key, JSON.stringify(r.data));
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const ends = coupon.ends_at ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(coupon.ends_at)) : "";
  const staffUrl = mine?.code ? `${window.location.origin}/x/${slug}/r/${mine.code}` : "";
  return (
    <div className="qp-coupon" data-testid="qp-coupon">
      <div className={`qp-ticket ${mine?.used_at ? "used" : ""}`}>
        {coupon.title && <small className="qp-ticket-title">{coupon.title}</small>}
        <b className="qp-ticket-offer">{coupon.offer || "🎁"}</b>
        {ends && <small>{t.validUntil.replace("{date}", ends)}</small>}
        {mine?.code ? (
          <>
            <div className="qp-ticket-cut" />
            <div className="qp-ticket-qr" dangerouslySetInnerHTML={{ __html: qrSvg({ text: staffUrl, px: 180 }) }} />
            <code className="qp-ticket-code" data-testid="qp-coupon-code">
              {mine.code}
            </code>
            {mine.used_at ? <span className="qp-ticket-used">{t.couponUsed}</span> : <small>{t.showStaff}</small>}
          </>
        ) : coupon.ended || coupon.gone ? (
          <p className="qp-ticket-off">{coupon.gone ? t.couponGone : t.couponEnded}</p>
        ) : (
          <>
            <button type="button" className="qp-btn" onClick={get} disabled={busy} data-testid="qp-get-coupon">
              {busy ? <Loader2 size={16} className="qp-spin" /> : <Ticket size={16} />} {t.getCoupon}
            </button>
            {coupon.left !== null && coupon.left !== undefined && <small>{t.left.replace("{n}", coupon.left)}</small>}
          </>
        )}
      </div>
      {err && <div className="qp-err">{err}</div>}
      {coupon.terms && <p className="qp-terms">{coupon.terms}</p>}
    </div>
  );
}

// staff page after scanning a customer's coupon: /x/:slug/r/:code
export function RedeemPage() {
  const { slug, code } = useParams();
  const [lang] = useState(startLang);
  const t = TEXT[lang];
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [pin, setPin] = useState(() => store.get(`qg-pin-${slug}`));
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    publicGet(`/qr/${encodeURIComponent(slug)}/coupon/${encodeURIComponent(code)}`)
      .then((r) => setInfo(r.data))
      .catch((x) => setErr(x.message));
  }, [slug, code]);
  const use = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await publicPost(`/qr/${encodeURIComponent(slug)}/redeem`, { code, pin });
      store.set(`qg-pin-${slug}`, pin);
      setInfo((x) => ({ ...x, used_at: r.data.used_at }));
      setOk(true);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const when = (d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  return (
    <div className="qp qp-plain qp-redeem" data-testid="qp-redeem">
      <div className="qp-redeem-box">
        <Ticket size={34} />
        {!info && !err && <Loader2 size={26} className="qp-spin" />}
        {info && (
          <>
            <small>{info.name}</small>
            <h1>{info.offer || info.title}</h1>
            <code className="qp-ticket-code">{info.code}</code>
            {info.used_at ? (
              <div className={`qp-redeem-state ${ok ? "ok" : "used"}`} data-testid="qp-redeem-state">
                {ok ? <Check size={22} /> : <Lock size={20} />}
                <b>{ok ? t.redeemOk : t.couponUsed}</b>
                <small>{when(info.used_at)}</small>
              </div>
            ) : (
              <>
                <span className="qp-redeem-state good">
                  <Check size={18} /> {t.couponGood}
                </span>
                <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder={t.staffPin} data-testid="qp-pin" />
                <button type="button" className="qp-btn" onClick={use} disabled={busy || pin.length < 4} data-testid="qp-redeem-go">
                  {busy ? <Loader2 size={16} className="qp-spin" /> : <Check size={16} />} {t.markUsed}
                </button>
              </>
            )}
          </>
        )}
        {err && <div className="qp-err">{err}</div>}
      </div>
    </div>
  );
}
