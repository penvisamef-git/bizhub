import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Code2, Copy, Download, ExternalLink, Grid3x3, Link2, Loader2, Lock, Maximize2, Minimize2, Share2, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";
import { publicGet, publicPost } from "../api/client";
import { PUBLIC_SITE_URL } from "../config";
import { READERS } from "./readers";
import { SHELVES } from "./shelves";
import { landOpen } from "./ShelfView";
import LeadForm from "./LeadForm";
import { FB_TEXT, keepLang, startLang } from "./text";
import "./fbook.css";

const ZOOMS = [1, 1.5, 2, 3, 4]; // the + / − buttons step through these; pinch can stop anywhere in between
const ZMAX = 5;
const HD_AT = 1.5; // from this zoom the sharper page picture is loaded
const TURN_MS = 650;
const store = {
  get: (k, s = sessionStorage) => {
    try {
      return s.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v, s = sessionStorage) => {
    try {
      s.setItem(k, v);
    } catch {
      /* private window */
    }
  },
};

// a soft paper "swish" made on the spot (no sound file to download)
let audio = null;
function swish() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const ac = audio;
    const d = 0.38;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * d), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const x = i / ch.length;
      ch[i] = (Math.random() * 2 - 1) * Math.min(1, x * 14) * (1 - x) ** 2.2;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(3800, ac.currentTime);
    f.frequency.exponentialRampToValueAtTime(700, ac.currentTime + d);
    const g = ac.createGain();
    g.gain.value = 0.32;
    src.connect(f).connect(g).connect(ac.destination);
    src.start();
  } catch {
    /* no audio */
  }
}

// one page picture (a soft placeholder until it arrives)
const LOADED = new Set();
// where a box on a page goes
const web = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const ytEmbed = (v) => {
  const m = String(v).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0` : "";
};
const hrefOf = (l) =>
  l.kind === "phone"
    ? `tel:${l.value.replace(/[^+\d]/g, "")}`
    : l.kind === "email"
      ? `mailto:${l.value}`
      : l.kind === "telegram"
        ? /^https?:/i.test(l.value)
          ? l.value
          : `https://t.me/${l.value.replace(/^@/, "")}`
        : l.kind === "page"
          ? "#"
          : web(l.value);

function Page({ n, url, hd, className, style, onShown, links, onLink }) {
  const [ok, setOk] = useState(() => LOADED.has(url));
  const [hdOk, setHdOk] = useState(() => !!hd && LOADED.has(hd));
  useEffect(() => setOk(LOADED.has(url)), [url]);
  useEffect(() => setHdOk(!!hd && LOADED.has(hd)), [hd]);
  if (!n) return null;
  return (
    <div className={`fr-page ${className || ""} ${ok ? "ok" : ""}`} style={style} data-page={n}>
      <img
        src={url}
        alt=""
        draggable="false"
        onLoad={() => {
          LOADED.add(url);
          setOk(true);
          onShown?.();
        }}
      />
      {/* zoomed in: a sharper picture fades in over the normal one */}
      {hd && (
        <img
          className={`fr-hd ${hdOk ? "on" : ""}`}
          src={hd}
          alt=""
          draggable="false"
          onLoad={() => {
            LOADED.add(hd);
            setHdOk(true);
          }}
        />
      )}
      {!ok && <Loader2 size={22} className="fr-spin" />}
      {ok &&
        links?.map((l, i) => (
          <a
            key={i}
            className={`fr-link k-${l.kind}`}
            style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.h * 100}%`, animationDelay: `${i * 90}ms` }}
            href={hrefOf(l)}
            target={["page", "phone", "email"].includes(l.kind) ? undefined : "_blank"}
            rel="noreferrer"
            onClick={(e) => onLink(l, e)}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            data-testid="fr-link"
          >
            {l.label ? <span>{l.label}</span> : null}
          </a>
        ))}
    </div>
  );
}

const off = (t, onRetry) => (
  <div className="fr-off">
    <BookOpen size={46} />
    <h1>{t.offTitle}</h1>
    <p>{t.offSub}</p>
    {onRetry && (
      <button type="button" onClick={onRetry}>
        {t.retry}
      </button>
    )}
  </div>
);

// /b/:slug — one book as a flip book
export default function BookPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const tokenKey = `fb-t-${slug}`;
  const load = useCallback(() => {
    const tok = store.get(tokenKey);
    return publicGet(`/book/${encodeURIComponent(slug)}${tok ? `?t=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => {
        setBook(r.data);
        setError(null);
        document.title = r.data.title;
        if (!r.data.locked && !store.get(`fb-seen-${slug}`)) {
          store.set(`fb-seen-${slug}`, "1");
          publicPost(`/book/${encodeURIComponent(slug)}/hit`, {}).catch(() => {});
        }
        return r.data;
      })
      .catch((e) => {
        setError(e);
        landOpen();
      });
  }, [slug, tokenKey]);
  useEffect(() => {
    load();
  }, [load]);
  const lang0 = book?.shelf?.lang;
  const [lang, setLang] = useState(() => startLang("km"));
  useEffect(() => {
    if (lang0 && !store.get("fb-lang", localStorage)) setLang(lang0 === "en" ? "en" : "km");
  }, [lang0]);
  const t = FB_TEXT[lang];
  if (error) return <div className="fr fr-plain">{off(t, error.code === "NETWORK" ? load : null)}</div>;
  if (!book)
    return (
      <div className="fr fr-plain">
        <div className="fr-off">
          <Loader2 size={30} className="fr-spin" />
          <p>{t.loading}</p>
        </div>
      </div>
    );
  if (book.locked) return <Unlock book={book} t={t} slug={slug} onOpen={(tok) => (store.set(tokenKey, tok), load())} />;
  return (
    <Reader
      book={book}
      t={t}
      lang={lang}
      setLang={(l) => {
        setLang(l);
        keepLang(l);
      }}
      embed={embed}
      startPage={Number(params.get("page")) || 1}
    />
  );
}

function Unlock({ book, t, slug, onOpen }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const look = READERS[book.reader_theme] || READERS.classic;
  useEffect(() => landOpen(), []);
  const go = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setErr("");
    try {
      const r = await publicPost(`/book/${encodeURIComponent(slug)}/unlock`, { password: pw });
      onOpen(r.data.token);
    } catch (x) {
      const code = x.body?.code || x.response?.code;
      setErr(code === "wrong_password" ? t.wrongPw : code === "slow" ? t.slow : x.message);
      setBusy(false);
    }
  };
  return (
    <div className={`fr fr-lockpage ${look.dark ? "fr-dark" : ""}`} style={{ "--r-bg": look.bg, "--r-ink": look.ink, "--r-muted": look.muted, "--f-accent": accentOf(book.shelf) }}>
      <div className="fr-lock-cover" style={{ backgroundImage: `url(${book.cover})` }} />
      <form className="fr-lock-card" onSubmit={go}>
        <span className="fr-lock-ic">
          <Lock size={24} />
        </span>
        <img src={book.cover} alt="" className="fr-lock-thumb" />
        <h1>{book.title}</h1>
        <b>{t.pwTitle}</b>
        <p>{t.pwSub}</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t.pw} autoFocus data-testid="fr-pw" />
        {err && <div className="fr-err">{err}</div>}
        <button type="submit" disabled={busy || !pw} data-testid="fr-pw-open">
          {busy ? <Loader2 size={16} className="fr-spin" /> : <BookOpen size={16} />} {t.open}
        </button>
        {book.shelf?.slug && (
          <Link to={`/f/${book.shelf.slug}`} className="fr-lock-back">
            <ArrowLeft size={14} /> {t.back}
          </Link>
        )}
      </form>
    </div>
  );
}

const accentOf = (shelf) => shelf?.color || SHELVES[shelf?.shelf_theme]?.accent || "#E0581A";
const urlOf = (tpl, n) => (n ? tpl.replace("{page}", n) : "");

function Reader({ book, t, lang, setLang, embed, startPage }) {
  const N = Math.max(1, book.pages || 1);
  const look = READERS[book.reader_theme] || READERS.classic;
  const ratio = book.width && book.height ? book.width / book.height : 0.707;
  const stageRef = useRef(null);
  const rootRef = useRef(null);
  const [box, setBox] = useState({ w: 1000, h: 700 });
  const [page, setPage] = useState(() => Math.min(N, Math.max(1, startPage)));
  const [flip, setFlip] = useState(null); // { dir, from, to }
  const [zoomed, setZoomed] = useState(false); // zoom > 1 (the page can be moved around)
  const [zLabel, setZLabel] = useState(1); // the zoom shown in the little pill
  const [focus, setFocus] = useState(false); // "Full view": no bars, no frame, the page fills the screen
  const [chrome, setChrome] = useState(true); // full view: the floating bar is showing
  const [panel, setPanel] = useState(""); // "thumbs" | "share"
  const [sound, setSound] = useState(() => {
    const v = store.get("fb-sound", localStorage);
    return v === null ? book.sound !== false : v === "1";
  });
  const [, setFull] = useState(false);
  const [hint, setHint] = useState(true);
  const [copied, setCopied] = useState("");
  const [goto, setGoto] = useState("");
  const seenPages = useRef(new Set());
  const [video, setVideo] = useState("");
  // contact form (the owner's fb_leads): once given on this device, it is not asked again
  const lead = book.lead;
  const leadKey = `fb-lead-${book.slug}`;
  const [leadDone, setLeadDone] = useState(() => !lead || !!store.get(leadKey, localStorage) || !!store.get(leadKey));
  const [gate, setGate] = useState(() => !!lead && !leadDone && (lead.mode === "before" || Math.min(N, Math.max(1, startPage)) > lead.page));
  const pending = useRef(null);
  const reduce = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // measure the room for the book
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const narrow = box.w < 640;
  const availW = box.w - (focus ? (narrow ? 0 : 24) : narrow ? 16 : 128);
  const availH = box.h - (focus ? (narrow ? 0 : 12) : narrow ? 16 : 36);
  const spread = N > 1 && availW > 620 && availW / availH > ratio * 1.25;
  const fitH = Math.max(120, Math.min(availH, spread ? availW / (2 * ratio) : availW / ratio));
  // the book is laid out to fit; zoom and moving are a transform on top (smooth on phones)
  const ph = Math.round(fitH);
  const pw = Math.round(fitH * ratio);

  const spreadOf = useCallback(
    (p) => {
      if (!spread) return [p];
      if (p <= 1) return [null, 1];
      const a = p % 2 === 0 ? p : p - 1;
      return [a, a + 1 <= N ? a + 1 : null];
    },
    [spread, N],
  );
  const anchor = (v) => v.find(Boolean);
  const cur = spreadOf(page);
  const go = useCallback(
    (p) => {
      if (flip) return;
      const target = Math.min(N, Math.max(1, p));
      const to = spreadOf(target);
      if (anchor(to) === anchor(cur)) return;
      if (lead && !leadDone && Math.max(...to.filter(Boolean)) > (lead.mode === "before" ? 0 : lead.page)) {
        pending.current = target;
        setGate(true);
        return;
      }
      setHint(false);
      if (reduce || zoomed) {
        setPage(anchor(to));
        return;
      }
      if (sound) swish();
      setFlip({ dir: anchor(to) > anchor(cur) ? "next" : "prev", from: cur, to });
    },
    [flip, N, spreadOf, cur, reduce, zoomed, sound, lead, leadDone],
  );
  const linksOf = (n) => (n ? (book.links || []).filter((l) => l.page === n) : null);
  const onLink = (l, e) => {
    if (l.kind === "page") {
      e.preventDefault();
      go(Number(l.value));
    } else if (l.kind === "youtube" && ytEmbed(l.value)) {
      e.preventDefault();
      setVideo(ytEmbed(l.value));
    }
  };
  const next = () => go(spread ? (cur[1] ?? cur[0]) + 1 : page + 1);
  const prev = () => go(spread ? (cur[0] ?? cur[1]) - 1 : page - 1);
  const done = () => {
    if (!flip) return;
    setPage(anchor(flip.to));
    setFlip(null);
  };
  // safety: finish a turn even if the animation event never comes
  useEffect(() => {
    if (!flip) return undefined;
    const tm = setTimeout(done, TURN_MS + 250);
    return () => clearTimeout(tm);
  }, [flip]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the page in the link + count pages read (once each, after a short stay)
  useEffect(() => {
    if (!embed) {
      const u = new URL(window.location.href);
      if (page > 1) u.searchParams.set("page", page);
      else u.searchParams.delete("page");
      window.history.replaceState(window.history.state, "", u);
    }
    const tm = setTimeout(() => {
      for (const p of spreadOf(page).filter(Boolean)) {
        if (seenPages.current.has(p)) continue;
        seenPages.current.add(p);
        publicPost(`/book/${encodeURIComponent(book.slug)}/hit`, { page: p }).catch(() => {});
      }
    }, 900);
    // get the next pages ready
    for (let p = page - 2; p <= page + 4; p++) if (p >= 1 && p <= N) new Image().src = urlOf(book.page_url, p);
    return () => clearTimeout(tm);
  }, [page, spreadOf]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tm = setTimeout(() => setHint(false), 4200);
    return () => clearTimeout(tm);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (e.key === "Home") go(1);
      else if (e.key === "End") go(N);
      else if (e.key === "Escape") {
        if (panel) setPanel("");
        else if (focus) toggleFocus();
      } else if (e.key === "+" || e.key === "=") zoomStep(1);
      else if (e.key === "-") zoomStep(-1);
      else if (e.key === "0") zoomTo(1);
      else if (e.key === "f" || e.key === "F") toggleFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const focusRef = useRef(false);
  focusRef.current = focus;
  useEffect(() => {
    const on = () => {
      const isFull = !!document.fullscreenElement;
      setFull(isFull);
      if (!isFull && focusRef.current === "fs") setFocus(false); // Esc left the browser full screen → leave full view too
    };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // ---- zoom + move + swipe (pointer events: fingers, mouse, pen) ----
  const deskRef = useRef(null);
  const v = useRef({ z: 1, x: 0, y: 0 }); // zoom and where the page is moved to (from the middle of the stage)
  const bookW = spread ? pw * 2 : pw;
  const dims = useRef({});
  dims.current = { W: box.w, H: box.h, bw: bookW, bh: ph };
  const clampV = (n) => {
    const { W, H, bw, bh } = dims.current;
    const z = Math.min(ZMAX, Math.max(1, n.z));
    if (z < 1.02) return { z: 1, x: n.x, y: 0, at1: true };
    const mx = Math.max(0, (bw * z - W) / 2 + 12);
    const my = Math.max(0, (bh * z - H) / 2 + 12);
    return { z, x: Math.min(mx, Math.max(-mx, n.x)), y: Math.min(my, Math.max(-my, n.y)) };
  };
  const paint = (animate) => {
    const el = deskRef.current;
    if (!el) return;
    const { z, x, y } = v.current;
    el.classList.toggle("fr-glide", !!animate);
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
  };
  const settle = () => {
    const z = v.current.z;
    setZoomed(z > 1.02);
    setZLabel(Math.round(z * 10) / 10);
  };
  const setV = (n, animate) => {
    const c = clampV(n);
    v.current = { z: c.z, x: c.at1 ? (animate ? 0 : c.x) : c.x, y: c.y };
    paint(animate);
  };
  // zoom keeping the point (sx, sy) — measured from the middle of the stage — still under the finger / mouse
  const zoomAround = (nz, sx = 0, sy = 0, animate) => {
    const { z, x, y } = v.current;
    const k = Math.min(ZMAX, Math.max(1, nz)) / z;
    setV({ z: z * k, x: sx - (sx - x) * k, y: sy - (sy - y) * k }, animate);
    if (nz <= 1.02) setV({ z: 1, x: 0, y: 0 }, animate);
    settle();
  };
  const zoomTo = (nz) => zoomAround(nz, 0, 0, true);
  const zoomStep = (dir) => {
    const z = v.current.z;
    const next = dir > 0 ? ZOOMS.find((s) => s > z + 0.05) || ZMAX : [...ZOOMS].reverse().find((s) => s < z - 0.05) || 1;
    zoomTo(next);
  };
  // the stage size changed (rotate phone, full view): keep the page inside
  useEffect(() => {
    setV(v.current);
  }, [box.w, box.h, bookW, ph]); // eslint-disable-line react-hooks/exhaustive-deps
  // a new page while zoomed: start at its top
  useEffect(() => {
    if (v.current.z > 1.02) setV({ ...v.current, y: 1e6 }, true);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const pts = useRef(new Map());
  const g = useRef(null); // the gesture going on
  const inertia = useRef(0);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const tapTimer = useRef(0);
  const rel = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };
  const startPinch = () => {
    const [a, b] = [...pts.current.values()];
    g.current = { mode: "pinch", z0: v.current.z, x0: v.current.x, y0: v.current.y, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  const onDown = (e) => {
    if (e.button > 0 || e.target.closest(".fr-link, .fr-nav, .fr-fbar, .fr-zpill")) return;
    cancelAnimationFrame(inertia.current);
    if (e.pointerType === "mouse") pts.current.clear(); // a mouse let go outside the window
    const p = rel(e);
    pts.current.set(e.pointerId, p);
    if (pts.current.size === 2) startPinch();
    else if (pts.current.size === 1) g.current = { mode: v.current.z > 1.02 ? "pan" : "swipe", s: p, x0: v.current.x, y0: v.current.y, t: Date.now(), moved: false, trail: [{ ...p, t: Date.now() }] };
  };
  const onMove = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = rel(e);
    pts.current.set(e.pointerId, p);
    const G = g.current;
    if (!G) return;
    if (G.mode === "pinch" && pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = Math.min(ZMAX * 1.15, Math.max(0.85, (G.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / G.d0));
      const k = z / G.z0;
      // the point between the fingers stays under the fingers (and follows them)
      const n = { z, x: m.x - (G.m0.x - G.x0) * k, y: m.y - (G.m0.y - G.y0) * k };
      v.current = z < 1 ? { z, x: n.x, y: n.y } : { ...clampV(n), z };
      paint(false);
      G.moved = true;
      return;
    }
    const dx = p.x - G.s.x;
    const dy = p.y - G.s.y;
    if (!G.moved && Math.hypot(dx, dy) > 6) G.moved = true;
    if (!G.moved) return;
    G.trail.push({ ...p, t: Date.now() });
    if (G.trail.length > 6) G.trail.shift();
    if (G.mode === "pan") {
      setV({ z: v.current.z, x: G.x0 + dx, y: G.y0 + dy });
    } else if (G.mode === "swipe" && !flip) {
      // the page follows the finger; a little stiff at the first / last page
      const atEnd = (dx > 0 && anchor(cur) <= 1) || (dx < 0 && (spread ? (cur[1] ?? cur[0]) : page) >= N);
      v.current = { z: 1, x: atEnd ? dx * 0.25 : dx * 0.9, y: 0 };
      paint(false);
    }
  };
  const onUp = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = rel(e);
    pts.current.delete(e.pointerId);
    const G = g.current;
    if (!G) return;
    if (G.mode === "pinch") {
      if (pts.current.size === 1) {
        // one finger still down: keep moving the page with it
        const [q] = [...pts.current.values()];
        g.current = { mode: "pan", s: q, x0: v.current.x, y0: v.current.y, t: Date.now(), moved: true, trail: [{ ...q, t: Date.now() }] };
        return;
      }
      g.current = null;
      setV(v.current, true); // spring back inside (and to 1× if pinched smaller)
      settle();
      return;
    }
    g.current = null;
    const dx = p.x - G.s.x;
    const dy = p.y - G.s.y;
    if (!G.moved) {
      if (G.mode === "pan") settle();
      tap(p, e.pointerType);
      return;
    }
    const tr = G.trail;
    const a = tr[0];
    const b = tr[tr.length - 1];
    const dt = Math.max(16, b.t - a.t);
    const vx = (b.x - a.x) / dt;
    const vy = (b.y - a.y) / dt;
    if (G.mode === "pan") {
      settle();
      // glide a little after a flick
      let sx = vx * 16;
      let sy = vy * 16;
      const step = () => {
        sx *= 0.92;
        sy *= 0.92;
        if (Math.abs(sx) < 0.3 && Math.abs(sy) < 0.3) return;
        setV({ z: v.current.z, x: v.current.x + sx, y: v.current.y + sy });
        inertia.current = requestAnimationFrame(step);
      };
      if (Date.now() - b.t < 80) inertia.current = requestAnimationFrame(step);
      return;
    }
    // swipe: turn when far or fast enough, otherwise slide back
    const far = Math.abs(dx) > Math.min(90, box.w * 0.18) || (Math.abs(vx) > 0.45 && Math.abs(dx) > 24);
    v.current = { z: 1, x: 0, y: 0 };
    paint(true);
    if (far && Math.abs(dx) > Math.abs(dy) * 1.1) {
      if (dx < 0) next();
      else prev();
    }
  };
  const tap = (p, kind) => {
    const now = Date.now();
    const L = lastTap.current;
    if (now - L.t < 300 && Math.hypot(p.x - L.x, p.y - L.y) < 40) {
      // double tap / double click: zoom in there, or back to fit
      clearTimeout(tapTimer.current);
      lastTap.current = { t: 0, x: 0, y: 0 };
      if (v.current.z > 1.02) zoomTo(1);
      else zoomAround(kind === "mouse" ? 2 : 2.5, p.x, p.y, true);
      return;
    }
    lastTap.current = { t: now, x: p.x, y: p.y };
    clearTimeout(tapTimer.current);
    if (focus) tapTimer.current = setTimeout(() => setChrome((c) => !c), 300);
  };
  // mouse wheel: Ctrl + wheel (and trackpad pinch) zooms, wheel moves a zoomed page
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const p = rel(e);
        // a mouse wheel notch ≈ +25%, a trackpad pinch is smooth
        zoomAround(v.current.z * Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * 0.0025), p.x, p.y, false);
      } else if (v.current.z > 1.02) {
        e.preventDefault();
        setV({ z: v.current.z, x: v.current.x - e.deltaX, y: v.current.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  // full view: the floating bar hides by itself after a moment
  useEffect(() => {
    if (!focus || !chrome) return undefined;
    const tm = setTimeout(() => setChrome(false), 3200);
    return () => clearTimeout(tm);
  }, [focus, chrome, page, zLabel]);
  const touchy = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches, []);

  // what is on the desk
  const showL = spread ? (flip ? (flip.dir === "next" ? flip.from[0] : flip.to[0]) : cur[0]) : null;
  const showR = spread ? (flip ? (flip.dir === "next" ? flip.to[1] : flip.from[1]) : cur[1]) : flip ? (flip.dir === "next" ? flip.to[0] : flip.from[0]) : page;
  const view = flip ? flip.to : cur;
  const shift = spread ? (view[0] == null ? -pw / 2 : view[1] == null ? pw / 2 : 0) : 0;
  let leaf = null;
  if (flip) {
    if (spread) leaf = flip.dir === "next" ? { cls: "fr-leaf-next", left: pw, front: flip.from[1], back: flip.to[0] } : { cls: "fr-leaf-prev", left: 0, front: flip.from[0], back: flip.to[1] };
    else leaf = flip.dir === "next" ? { cls: "fr-leaf-next", left: 0, front: flip.from[0], back: null } : { cls: "fr-leaf-in", left: 0, front: flip.to[0], back: null };
  }
  const label = spread ? cur.filter(Boolean).join("–") : String(page);
  const link = `${PUBLIC_SITE_URL}/b/${book.slug}`;
  const copy = (text, what) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(""), 1600);
  };
  const embedCode = `<iframe src="${link}?embed=1" width="100%" height="600" style="border:0;max-width:100%" allow="fullscreen" allowfullscreen></iframe>`;
  const firstShown = useRef(false);
  const shown = () => {
    if (firstShown.current) return;
    firstShown.current = true;
    setTimeout(landOpen, 80);
  };
  useEffect(() => {
    const tm = setTimeout(landOpen, 2500); // pictures slow: don't keep the cover over the reader
    return () => clearTimeout(tm);
  }, []);
  // "Full view": hide the top bar, the bottom bar and the frame so the page is as big as it can be.
  // Also asks the browser for full screen where it can (computers, Android); iPhone just fills the page.
  const toggleFocus = () => {
    if (focus) {
      setFocus(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      return;
    }
    setChrome(true);
    setPanel("");
    const req = rootRef.current?.requestFullscreen;
    if (req && !embed) {
      setFocus("fs");
      rootRef.current.requestFullscreen().catch(() => setFocus(true));
    } else setFocus(true);
  };
  const shelf = book.shelf || {};

  return (
    <div ref={rootRef} className={`fr ${look.dark ? "fr-dark" : ""} ${embed ? "fr-embed" : ""} ${focus ? "fr-focus" : ""}`} style={{ "--r-bg": look.bg, "--r-bar": look.bar, "--r-ink": look.ink, "--r-muted": look.muted, "--f-accent": accentOf(shelf) }} data-testid="fr">
      <header className="fr-top">
        {!embed && shelf.slug ? (
          <Link to={`/f/${shelf.slug}`} className="fr-back" title={t.back} aria-label={t.back}>
            <ArrowLeft size={18} />
          </Link>
        ) : null}
        {shelf.logo ? <img src={shelf.logo} alt="" className="fr-logo" /> : null}
        <div className="fr-title">
          <b>{book.title}</b>
          <small>
            {shelf.title}
            {book.edition > 1 ? ` · ${t.edition.replace("{n}", book.edition)}` : ""}
          </small>
        </div>
        <div className="fr-acts">
          <button type="button" onClick={() => setPanel(panel === "thumbs" ? "" : "thumbs")} className={panel === "thumbs" ? "on" : ""} title={t.thumbs} aria-label={t.thumbs} data-testid="fr-thumbs-btn">
            <Grid3x3 size={18} />
          </button>
          <button type="button" className="fr-hide-s" onClick={() => zoomStep(-1)} disabled={!zoomed} title={t.zoomOut} aria-label={t.zoomOut}>
            <ZoomOut size={18} />
          </button>
          <button type="button" onClick={() => zoomStep(1)} disabled={zLabel >= ZMAX} title={t.zoomIn} aria-label={t.zoomIn} className={zoomed ? "on" : ""} data-testid="fr-zoom">
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSound(!sound);
              store.set("fb-sound", sound ? "0" : "1", localStorage);
              if (!sound) swish();
            }}
            title={t.sound}
            aria-label={t.sound}
            aria-pressed={sound}
            className="fr-hide-s"
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button type="button" onClick={() => setPanel(panel === "share" ? "" : "share")} className={panel === "share" ? "on" : ""} title={t.share} aria-label={t.share} data-testid="fr-share-btn">
            <Share2 size={18} />
          </button>
          {book.pdf && (
            <a href={book.pdf} target="_blank" rel="noreferrer" download title={t.download} aria-label={t.download} data-testid="fr-download">
              <Download size={18} />
            </a>
          )}
          {embed && (
            <a href={link} target="_blank" rel="noreferrer" title={t.open} aria-label={t.open} className="fr-hide-s">
              <ExternalLink size={18} />
            </a>
          )}
          <button type="button" className="fr-focus-btn" onClick={toggleFocus} title={t.focus} aria-label={t.focus} data-testid="fr-focus">
            <Maximize2 size={18} />
          </button>
          {!embed && (
            <button type="button" className="fr-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
              {lang === "km" ? "EN" : "ខ្មែរ"}
            </button>
          )}
        </div>
      </header>

      <div ref={stageRef} className={`fr-stage ${zoomed ? "zoomed" : ""}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={(e) => e.pointerType === "mouse" && onUp(e)} data-testid="fr-stage">
        <div ref={deskRef} className="fr-desk">
          <div className={`fr-book ${spread ? "spread" : "single"}`} style={{ width: spread ? pw * 2 : pw, height: ph, transform: `translateX(${shift}px)` }}>
            {spread && <Page n={showL} url={urlOf(book.page_url, showL)} hd={zLabel >= HD_AT && book.page_hd ? urlOf(book.page_hd, showL) : ""} className="l" style={{ left: 0, width: pw, height: ph }} onShown={shown} links={flip ? null : linksOf(showL)} onLink={onLink} />}
            <Page n={showR} url={urlOf(book.page_url, showR)} hd={zLabel >= HD_AT && book.page_hd ? urlOf(book.page_hd, showR) : ""} className={spread ? "r" : "s"} style={{ left: spread ? pw : 0, width: pw, height: ph }} onShown={shown} links={flip ? null : linksOf(showR)} onLink={onLink} />
            {leaf && (
              <div className={`fr-leaf ${leaf.cls}`} style={{ left: leaf.left, width: pw, height: ph, animationDuration: `${TURN_MS}ms` }} onAnimationEnd={done}>
                <div className="fr-face front">{leaf.front ? <img src={urlOf(book.page_url, leaf.front)} alt="" draggable="false" /> : null}</div>
                <div className="fr-face back">{leaf.back ? <img src={urlOf(book.page_url, leaf.back)} alt="" draggable="false" /> : null}</div>
              </div>
            )}
            {!zoomed && spread && (
              <>
                <button type="button" className="fr-hit l" onClick={prev} aria-label={t.prev} tabIndex={-1} />
                <button type="button" className="fr-hit r" onClick={next} aria-label={t.next} tabIndex={-1} />
              </>
            )}
          </div>
        </div>
        <button type="button" className="fr-nav prev" onClick={prev} disabled={anchor(cur) <= 1} aria-label={t.prev} data-testid="fr-prev">
          <ChevronLeft size={26} />
        </button>
        <button type="button" className="fr-nav next" onClick={next} disabled={(spread ? (cur[1] ?? cur[0]) : page) >= N} aria-label={t.next} data-testid="fr-next">
          <ChevronRight size={26} />
        </button>
        {hint && N > 1 && !focus && <div className="fr-hint">{touchy ? t.hintTouch : t.hint}</div>}
        {/* zoomed (normal view): − 2× + and back to fit */}
        {zoomed && !focus && (
          <div className="fr-zpill" data-testid="fr-zpill">
            <button type="button" onClick={() => zoomStep(-1)} aria-label={t.zoomOut}>
              <ZoomOut size={17} />
            </button>
            <b>{zLabel}×</b>
            <button type="button" onClick={() => zoomStep(1)} disabled={zLabel >= ZMAX} aria-label={t.zoomIn}>
              <ZoomIn size={17} />
            </button>
            <button type="button" onClick={() => zoomTo(1)} aria-label={t.zoomReset} title={t.zoomReset}>
              <Minimize2 size={16} />
            </button>
          </div>
        )}
        {/* full view: one small floating bar — page, zoom, leave */}
        {focus && (
          <div className={`fr-fbar ${chrome ? "" : "hide"}`} data-testid="fr-fbar" onPointerDown={() => setChrome(true)}>
            <button type="button" onClick={prev} disabled={anchor(cur) <= 1} aria-label={t.prev}>
              <ChevronLeft size={20} />
            </button>
            <span className="fr-fbar-n">
              {label} <small>/ {N}</small>
            </span>
            <button type="button" onClick={next} disabled={(spread ? (cur[1] ?? cur[0]) : page) >= N} aria-label={t.next}>
              <ChevronRight size={20} />
            </button>
            <i className="fr-fbar-sep" />
            <button type="button" onClick={() => zoomStep(-1)} disabled={!zoomed} aria-label={t.zoomOut}>
              <ZoomOut size={18} />
            </button>
            <b className="fr-fbar-z">{zLabel}×</b>
            <button type="button" onClick={() => zoomStep(1)} disabled={zLabel >= ZMAX} aria-label={t.zoomIn}>
              <ZoomIn size={18} />
            </button>
            <i className="fr-fbar-sep" />
            <button type="button" className="fr-fbar-exit" onClick={toggleFocus} aria-label={t.focusOff} title={t.focusOff} data-testid="fr-focus-off">
              <Minimize2 size={18} />
            </button>
          </div>
        )}
      </div>

      <footer className="fr-bar">
        <button type="button" onClick={() => go(1)} disabled={anchor(cur) <= 1} aria-label={t.first} title={t.first}>
          <ChevronFirst size={18} />
        </button>
        <span className="fr-count" data-testid="fr-count">
          {label} <small>/ {N}</small>
        </span>
        <input className="fr-range" type="range" min="1" max={N} value={page} onChange={(e) => go(Number(e.target.value))} aria-label={t.goTo} style={{ "--p": `${N > 1 ? ((page - 1) / (N - 1)) * 100 : 100}%` }} />
        <form
          className="fr-goto fr-hide-s"
          onSubmit={(e) => {
            e.preventDefault();
            if (goto) go(Number(goto));
            setGoto("");
          }}
        >
          <input value={goto} onChange={(e) => setGoto(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t.page} inputMode="numeric" aria-label={t.goTo} />
        </form>
        <button type="button" onClick={() => go(N)} disabled={(spread ? (cur[1] ?? cur[0]) : page) >= N} aria-label={t.last} title={t.last}>
          <ChevronLast size={18} />
        </button>
      </footer>

      {video && (
        <div className="fr-video" onMouseDown={(e) => e.target === e.currentTarget && setVideo("")} data-testid="fr-video">
          <div className="fr-video-in">
            <button type="button" onClick={() => setVideo("")} aria-label={t.close}>
              <X size={20} />
            </button>
            <iframe src={video} title="video" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
          </div>
        </div>
      )}
      {gate && lead && (
        <LeadForm
          path={`/book/${encodeURIComponent(book.slug)}/lead`}
          extra={{ page }}
          form={lead}
          t={t}
          cover={book.cover}
          before={lead.mode === "before"}
          onDone={(given) => {
            if (given) store.set(leadKey, "1", localStorage);
            else store.set(leadKey, "skip"); // asked again on the next visit
            setLeadDone(true);
            setGate(false);
            const target = pending.current;
            pending.current = null;
            if (target) setTimeout(() => setPage(target), 30);
          }}
        />
      )}
      {panel === "thumbs" && (
        <div className="fr-panel fr-thumbs" data-testid="fr-thumbs">
          <div className="fr-panel-head">
            <b>{t.thumbs}</b>
            <button type="button" onClick={() => setPanel("")} aria-label={t.close}>
              <X size={18} />
            </button>
          </div>
          <div className="fr-thumb-grid">
            {Array.from({ length: N }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={cur.includes(p) ? "on" : ""}
                onClick={() => {
                  setPanel("");
                  go(p);
                }}
                ref={cur.includes(p) ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
              >
                <img src={urlOf(book.thumb_url, p)} alt="" loading="lazy" style={{ aspectRatio: ratio }} />
                <small>{p}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === "share" && (
        <div className="fr-panel fr-share" data-testid="fr-share">
          <div className="fr-panel-head">
            <b>{t.share}</b>
            <button type="button" onClick={() => setPanel("")} aria-label={t.close}>
              <X size={18} />
            </button>
          </div>
          <div className="fr-share-in">
            <img src={book.cover} alt="" />
            <div>
              <b>{book.title}</b>
              <small>{t.pages.replace("{n}", N)}</small>
            </div>
          </div>
          <button type="button" className="fr-share-row" onClick={() => copy(link, "link")}>
            <Link2 size={16} /> <span>{t.copyLink}</span> {copied === "link" ? <Check size={16} /> : <Copy size={15} />}
          </button>
          <button type="button" className="fr-share-row" onClick={() => copy(`${link}?page=${page}`, "page")}>
            <BookOpen size={16} />
            <span>
              {t.copyPage} ({label})
            </span>
            {copied === "page" ? <Check size={16} /> : <Copy size={15} />}
          </button>
          <label className="fr-embed-code">
            <span>
              <Code2 size={15} /> {t.embed}
            </span>
            <textarea readOnly value={embedCode} rows={3} onFocus={(e) => e.target.select()} />
          </label>
          <button type="button" className="fr-share-copy" onClick={() => copy(embedCode, "embed")}>
            {copied === "embed" ? <Check size={15} /> : <Copy size={15} />} {copied === "embed" ? t.copied : t.copy}
          </button>
        </div>
      )}
    </div>
  );
}
