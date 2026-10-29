// The cart divider on the selling screens (v3.1.0): the cashier drags it to make the cart wider or narrower, and puts the
// cart on the left or the right. Each cashier's own choice, kept in this browser (another screen, another size).
// Click the handle: Small / Medium / Large, left / right, back to normal. Double-click: back to normal.
// Keyboard: focus the handle, ← → to resize, Enter for the menu, Home = normal.
// The BizHub POS app does the same (bizhub-app-pos lib/core/pos_split.dart). Phones keep their own layout (CSS below
// 860 / 900 px: no divider).
//
//   const split = useCartSplit({ scope: "mart", who: staff._id, whoName: staff.name, thing: "cart", normal: 390, lang });
//   <div className={`mp-sell ${split.className}`} style={split.style}>  <main/>  {split.handle}  <aside className="… cs-cart"/>  </div>
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import "./cartsplit.css";

const TEXT = {
  en: {
    drag: "Drag to make the {x} wider or narrower — click for more",
    size: "Size of the {x}",
    small: "Small",
    medium: "Medium",
    large: "Large",
    left: "Put the {x} on the left",
    right: "Put the {x} on the right",
    reset: "Back to normal",
    mine: "Only for {name}, in this browser.",
    cart: "cart",
    order: "order",
  },
  km: {
    drag: "អូសដើម្បីធ្វើឲ្យ{x}ធំ ឬតូច — ចុចសម្រាប់ជម្រើសបន្ថែម",
    size: "ទំហំ{x}",
    small: "តូច",
    medium: "មធ្យម",
    large: "ធំ",
    left: "ដាក់{x}នៅខាងឆ្វេង",
    right: "ដាក់{x}នៅខាងស្តាំ",
    reset: "ត្រឡប់ដូចដើម",
    mine: "សម្រាប់តែ {name} លើកម្មវិធីរុករកនេះ។",
    cart: "កន្ត្រក",
    order: "ការកុម្ម៉ង់",
  },
};

export const SMALL = 320;
export const LARGE = 520;
export const MIN = 300; // the Pay button still fits
const HANDLE = 14;
const MIN_MAIN = 360; // the products keep at least 2 columns
// the widest the cart may be on a screen this wide (never more than 60%)
export const maxFor = (total) => Math.max(MIN, Math.min(total * 0.6, total - MIN_MAIN - HANDLE));
export const keyOf = (scope, who) => `bizhub_pos_cart:${scope}:${who || "device"}`;
const clamp = (w, max) => Math.round(Math.min(Math.max(w, MIN), max));

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "{}");
    return { w: Number.isFinite(v.w) ? v.w : null, left: v.side === "left" };
  } catch {
    return { w: null, left: false };
  }
}
function save(key, w, left) {
  try {
    localStorage.setItem(key, JSON.stringify({ w, side: left ? "left" : "right" }));
  } catch {
    /* private window: this time only */
  }
}

export function useCartSplit({ scope, who, whoName = "", thing = "cart", normal = 380, lang = "en" }) {
  const key = keyOf(scope, who);
  const [st, setSt] = useState(() => load(key));
  const [total, setTotal] = useState(0); // the width of the whole selling screen
  const [menu, setMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);
  const drag = useRef(null);
  const clickTimer = useRef(0);
  const x = TEXT[lang] || TEXT.en;
  const name = x[thing] || thing;

  // another cashier logged in: their own size
  useEffect(() => setSt(load(key)), [key]);
  // follow the screen's width (a window made smaller: the cart fits in)
  useEffect(() => {
    const grid = ref.current?.parentElement;
    if (!grid) return undefined;
    const ro = new ResizeObserver(() => setTotal(grid.clientWidth));
    ro.observe(grid);
    setTotal(grid.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(clickTimer.current), []);

  const max = total ? maxFor(total) : 10000;
  const w = clamp(st.w ?? normal, max);
  const set = (next) => {
    setSt(next);
    save(key, next.w, next.left);
  };
  const reset = () => set({ w: null, left: false });

  // the menu closes on a click outside or Escape
  useEffect(() => {
    if (!menu) return undefined;
    const out = (e) => !ref.current?.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest(".cs-menu")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, w, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setMenu(false);
    }
    setSt((s) => ({ ...s, w: clamp(s.left ? d.w + dx : d.w - dx, max) }));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      setSt((s) => {
        save(key, s.w, s.left);
        return s;
      });
      return;
    }
    // a click: the menu (a double-click resets instead)
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setMenu((m) => !m), 230);
  };
  const onDoubleClick = (e) => {
    if (e.target.closest(".cs-menu")) return;
    clearTimeout(clickTimer.current);
    setMenu(false);
    reset();
  };
  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 60 : 20;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const wider = (e.key === "ArrowLeft") !== st.left;
      set({ ...st, w: clamp(w + (wider ? step : -step), max) });
    } else if (e.key === "Home") {
      e.preventDefault();
      reset();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMenu((m) => !m);
    }
  };

  const pick = (fn) => () => {
    fn();
    setMenu(false);
  };
  const near = (v) => Math.abs(w - clamp(v, max)) < 2;
  const Item = ({ on, onClick, children, id }) => (
    <button type="button" role="menuitem" className={`cs-item${on ? " on" : ""}`} onClick={onClick} data-testid={`cs-${id}`}>
      {children}
      {on && <Check size={16} className="cs-check" aria-hidden="true" />}
    </button>
  );

  const handle = (
    <div
      ref={ref}
      className={`cs-handle${dragging ? " dragging" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={MIN}
      aria-valuemax={Math.round(max)}
      aria-valuenow={w}
      aria-label={x.drag.replace("{x}", name)}
      title={x.drag.replace("{x}", name)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      data-testid="cs-handle"
    >
      <span className="cs-grip" aria-hidden="true" />
      {menu && (
        <div className={`cs-menu ${st.left ? "from-left" : "from-right"}`} role="menu" data-testid="cs-menu">
          <b className="cs-title">{x.size.replace("{x}", name)}</b>
          <Item id="small" on={near(SMALL)} onClick={pick(() => set({ ...st, w: SMALL }))}>
            {x.small}
          </Item>
          <Item id="medium" on={near(normal)} onClick={pick(() => set({ ...st, w: null }))}>
            {x.medium}
          </Item>
          <Item id="large" on={near(LARGE)} onClick={pick(() => set({ ...st, w: LARGE }))}>
            {x.large}
          </Item>
          <hr />
          {st.left ? (
            <Item id="right" onClick={pick(() => set({ ...st, left: false }))}>
              <ArrowRight size={16} aria-hidden="true" /> {x.right.replace("{x}", name)}
            </Item>
          ) : (
            <Item id="left" onClick={pick(() => set({ ...st, left: true }))}>
              <ArrowLeft size={16} aria-hidden="true" /> {x.left.replace("{x}", name)}
            </Item>
          )}
          <Item id="reset" onClick={pick(reset)}>
            <RotateCcw size={16} aria-hidden="true" /> {x.reset}
          </Item>
          <small className="cs-mine">{x.mine.replace("{name}", whoName || "—")}</small>
        </div>
      )}
    </div>
  );

  return { className: `cs-split${st.left ? " cs-left" : ""}`, style: { "--cs-w": `${w}px` }, handle, width: w, left: st.left };
}
