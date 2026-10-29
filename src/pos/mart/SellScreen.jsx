import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, Camera, Check, Gift, Lock, CloudOff, Minus, Package, PackagePlus, PauseCircle, Plus, Printer, ScanBarcode, Search, ShoppingCart, Star, Ticket, Trash2, X } from "lucide-react";
import { Modal } from "../../dashboard/super_admin/parts";
import { useCartSplit } from "../CartSplit";
import { ProductModal } from "../../dashboard/client/mart/MartProducts";
import { customMethodOf, methodName, money, printOf, riel, unitName } from "../../dashboard/client/mart/text";
import { ReceiptView, printReceipt } from "./receipt";
import { changeSplit, saleMoney } from "./calc";
import { applyPromos } from "./promo";
import { byPlu, parseScale } from "./scale";
import { showOnDisplay } from "./display";
import { xText } from "../../dashboard/client/mart/xtext";

const CART_KEY = "bizhub_mart_cart";
const readCart = () => {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY));
    return c && Array.isArray(c.lines) ? c : { lines: [], discount: null };
  } catch {
    return { lines: [], discount: null };
  }
};
const saveCart = (c) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
  } catch {
    /* private mode */
  }
};
// carts on hold (the cashier serves someone else, then comes back): kept on this device
const HELD_KEY = "bizhub_mart_held";
const readHeld = () => {
  try {
    const v = JSON.parse(localStorage.getItem(HELD_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const saveHeld = (list) => {
  try {
    localStorage.setItem(HELD_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
};
const COLORS = ["#0d9488", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#059669", "#dc2626", "#0891b2"];
const colorOf = (s) => COLORS[[...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

// The sale screen: scan / tap products → cart → pay (USD, riel or both; change in riel) → receipt
export default function SellScreen({ ctx, p }) {
  const { m, cur, lang } = ctx;
  const boot = ctx.data;
  const s = boot.settings;
  const [cart, setCart] = useState(readCart);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [modal, setModal] = useState(null);
  const [miss, setMiss] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  // the cashier moves the cart: wider / narrower, left / right (kept for them in this browser)
  const split = useCartSplit({ scope: "mart", who: boot.staff?._id, whoName: boot.staff?.name, thing: "cart", normal: 390, lang });
  const [held, setHeld] = useState(readHeld);
  const [payQr, setPayQr] = useState(null); // the QR on the customer screen while paying
  const thanksUntil = useRef(0);
  const [tick, setTick] = useState(0); // happy hours start / end while the screen is open
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const x = xText(lang);
  const input = useRef(null);
  useEffect(() => saveCart(cart), [cart]);
  useEffect(() => saveHeld(held), [held]);
  // hold the cart now (name optional) → an empty cart for the next customer
  const holdCart = (name, c = cart) => {
    if (!c.lines.length) return;
    setHeld((list) => [{ id: `h${Date.now()}`, name: (name || "").trim() || p.holdDefault.replace("{n}", list.length + 1), at: new Date().toISOString(), lines: c.lines, discount: c.discount || null }, ...list].slice(0, 30));
  };
  const resumeCart = (h) => {
    setHeld((list) => {
      const rest = list.filter((x) => x.id !== h.id);
      // what is in the cart now goes on hold, so nothing is lost
      return cart.lines.length ? [{ id: `h${Date.now()}`, name: p.holdDefault.replace("{n}", rest.length + 1), at: new Date().toISOString(), lines: cart.lines, discount: cart.discount || null }, ...rest] : rest;
    });
    setCart({ lines: h.lines, discount: h.discount || null });
  };
  const focus = useCallback(() => setTimeout(() => input.current?.focus(), 30), []);
  useEffect(() => {
    if (!modal) focus();
  }, [modal, focus]);

  const products = boot.products;
  const byCode = useMemo(() => new Map(products.filter((x) => x.barcode).map((x) => [x.barcode, x])), [products]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((x) => (!cat || (cat === "fav" ? x.fav : String(x.category_id) === cat)) && (!t || x.name.toLowerCase().includes(t) || (x.barcode || "").startsWith(t)));
  }, [products, q, cat]);

  const add = useCallback(
    (prod, qty = 1, separate = false) => {
      setMiss("");
      setCart((c) => {
        const i = separate ? -1 : c.lines.findIndex((l) => l.product_id === prod._id && l.price === prod.price && !l.weighed);
        const lines = [...c.lines];
        if (i >= 0) lines[i] = { ...lines[i], qty: Math.round((lines[i].qty + qty) * 1000) / 1000 };
        else lines.unshift({ key: `${prod._id}-${Date.now()}`, product_id: prod._id, name: prod.name, barcode: prod.barcode || "", price: prod.price, qty, photo: prod.photo || "", ...(separate ? { weighed: true } : {}) });
        return { ...c, lines };
      });
    },
    [setCart],
  );
  // a scanner types the code and presses Enter; "3*885…" = 3 of them
  const enter = (raw) => {
    const v = String(raw || "").trim();
    if (!v) return;
    const mq = v.match(/^(\d+(?:\.\d+)?)\s*[*xX]\s*(.+)$/);
    const qty = mq ? Number(mq[1]) : 1;
    const code = mq ? mq[2].trim() : v;
    const hit = byCode.get(code);
    if (hit) {
      add(hit, qty);
      setQ("");
      return;
    }
    // a weighing-scale label (mart_scale): the weight (or price) is inside the barcode
    const sc = boot.scale ? parseScale(code, boot.scale, cur) : null;
    const weighed = sc && byPlu(products, sc.plu);
    if (weighed) {
      const n = sc.weight ?? (weighed.price > 0 ? Math.round((sc.price / weighed.price) * 1000) / 1000 : 1);
      add(weighed, Math.max(0.001, n), true);
      setQ("");
      return;
    }
    const t = code.toLowerCase();
    const list = products.filter((x) => x.name.toLowerCase().includes(t));
    if (list.length === 1) {
      add(list[0], qty);
      setQ("");
      return;
    }
    if (!list.length) {
      setMiss(code);
      setQ("");
    }
  };

  // keys: anything typed outside a field goes to the scan box (USB scanners), F2 = pay
  useEffect(() => {
    const onKey = (e) => {
      if (modal) return;
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.lines.length) setModal("pay");
        return;
      }
      if (!typing(document.activeElement) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, cart.lines.length]);

  const setQty = (key, qty) => setCart((c) => ({ ...c, lines: qty <= 0 ? c.lines.filter((l) => l.key !== key) : c.lines.map((l) => (l.key === key ? { ...l, qty: Math.round(qty * 1000) / 1000 } : l)) }));
  // promotions (mart_promos): worked out here, the server does the same
  const promos = boot.promos || [];
  const categoryOf = useMemo(() => Object.fromEntries(products.map((pr) => [pr._id, pr.category_id ? String(pr.category_id) : ""])), [products]);
  const promo = useMemo(
    () => (promos.length ? applyPromos({ lines: cart.lines, promos, at: Date.now(), where: "pos", coupon: cart.coupon || "", currency: cur, categoryOf }) : { discount: 0, applied: [], coupon: "" }),
    [cart.lines, cart.coupon, promos, cur, categoryOf, tick], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const base = saleMoney({ lines: cart.lines, promo: promo.discount, currency: cur, rate: s.khr_rate, method: "aba", khr_round: s.khr_round || 100 });
  const discount = cart.discount ? (cart.discount.type === "pct" ? Math.min(100, cart.discount.value) * (base.subtotal - base.promo_discount) / 100 : cart.discount.value) : 0; // prettier-ignore
  // loyalty points (mart_loyalty): the member on this sale + points used now
  const loyalty = boot.loyalty;
  const member = loyalty ? cart.member : null;
  const pointsAsked = member ? Math.floor(Number(cart.redeem) || 0) : 0;
  const sum = saleMoney({ lines: cart.lines, discount, promo: promo.discount, points: pointsAsked && loyalty ? pointsAsked * loyalty.point_value : 0, currency: cur, rate: s.khr_rate, method: "aba", khr_round: s.khr_round || 100 });
  const earn = member && loyalty ? Math.floor(sum.total / (loyalty.earn_per || 1) + 1e-9) : 0;
  const sellExtra = {
    ...(cart.coupon && promo.coupon === "ok" ? { coupon: cart.coupon } : {}),
    ...(member ? { member_phone: member.phone, ...(member._id ? { member_id: member._id } : { member_name: member.name || "" }), ...(pointsAsked ? { redeem: pointsAsked } : {}) } : {}),
  };
  // customer screen (mart_display)
  useEffect(() => {
    if (!boot.display || Date.now() < thanksUntil.current) return;
    showOnDisplay({
      mode: !cart.lines.length ? "idle" : modal === "pay" ? "pay" : "cart",
      shop: { name: boot.business.name, logo: boot.business.logo_url },
      color: boot.pos_color || "",
      currency: cur,
      lines: cart.lines.map((l) => ({ key: l.key, name: l.name, qty: l.qty, total: Math.round(l.price * l.qty * 100) / 100 })),
      count: Math.round(cart.lines.reduce((a, l) => a + l.qty, 0) * 1000) / 1000,
      promos_applied: promo.applied,
      discount: sum.discount,
      points_value: sum.points_value,
      points_used: pointsAsked,
      total: sum.total,
      total_khr: sum.total_khr,
      member: member ? member.name || member.phone : "",
      member_points: member ? Math.round(member.points || 0) : 0,
      promos: promos
        .filter((pr) => !pr.code)
        .map((pr) => pr.name)
        .slice(0, 6),
      ...(modal === "pay" && payQr ? { qr: payQr.img, qr_label: payQr.label } : {}),
    });
  }, [cart, sum.total, modal, payQr, promo.discount]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = cart.lines.reduce((a, l) => a + l.qty, 0);
  const manager = ctx.role === "manager";
  const unitOf = (pid) => {
    const prod = products.find((x) => x._id === pid);
    return prod
      ? unitName(
          (boot.units || []).find((u) => String(u._id) === String(prod.unit_id)),
          lang,
        )
      : "";
  };
  const reset = () => {
    setCart({ lines: [], discount: null });
    setCartOpen(false);
  };
  const thanks = (sale) => {
    if (!boot.display) return;
    thanksUntil.current = Date.now() + 12000;
    showOnDisplay({
      mode: "thanks",
      shop: { name: boot.business.name, logo: boot.business.logo_url },
      color: boot.pos_color || "",
      currency: cur,
      total: sale.total,
      change: sale.method === "cash" ? sale.change : 0,
      change_khr: sale.change_khr,
      earned: sale.points_earned || 0,
    });
    setTimeout(() => {
      thanksUntil.current = 0;
      setTick((n) => n + 1);
      showOnDisplay({
        mode: "idle",
        shop: { name: boot.business.name, logo: boot.business.logo_url },
        color: boot.pos_color || "",
        currency: cur,
        promos: promos
          .filter((pr) => !pr.code)
          .map((pr) => pr.name)
          .slice(0, 6),
      });
    }, 12100);
  };

  return (
    <div className={`mp-sell ${split.className}`} style={split.style}>
      <section className="mp-left">
        <div className="mp-scan">
          <label className="mp-scan-box">
            <ScanBarcode size={20} />
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setMiss("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  enter(q);
                }
                if (e.key === "Escape") setQ("");
              }}
              placeholder={p.scanPh}
              aria-label={p.scanPh}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-testid="mp-scan"
            />
            {q && (
              <button type="button" className="mp-x" onClick={() => setQ("")} aria-label={p.clear}>
                <X size={16} />
              </button>
            )}
          </label>
          <button type="button" className="mp-cam" onClick={() => setModal("camera")} aria-label={p.scanCamera} title={p.scanCamera}>
            <Camera size={20} />
          </button>
        </div>
        {miss && (
          <div className="mp-miss">
            <Search size={15} /> <span>{p.noMatch.replace("{q}", miss)}</span>
            {manager && (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ newProduct: miss })}>
                <PackagePlus size={14} /> {p.addNew}
              </button>
            )}
            <button type="button" className="mp-x" onClick={() => setMiss("")} aria-label={p.close}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="mt-chips mp-cats">
          {[["", p.all], ...(products.some((x) => x.fav) ? [["fav", p.favs]] : []), ...boot.categories.map((c) => [String(c._id), c.name])].map(([k, label]) => (
            <button key={k || "all"} type="button" className={cat === k ? "on" : ""} onClick={() => setCat(k)}>
              {k === "fav" && <Star size={12} />} {label}
            </button>
          ))}
        </div>
        <div className="mp-grid">
          {shown.slice(0, 240).map((x) => (
            <button key={x._id} type="button" className="mp-prod" onClick={() => add(x)}>
              <span className="mp-prod-pic" style={x.photo ? undefined : { background: colorOf(x.name) }}>
                {x.photo ? <img src={x.photo} alt="" loading="lazy" /> : x.name.slice(0, 2)}
              </span>
              <span className="mp-prod-name">{x.name}</span>
              {x.stock !== undefined && <em className={`mp-stock ${x.stock <= 0 ? "out" : x.stock <= (x.low_stock ?? 5) ? "low" : ""}`}>{x.stock <= 0 ? p.outStock : p.left.replace("{n}", x.stock)}</em>}
              <b className="mp-prod-price">{money(x.price, cur)}</b>
            </button>
          ))}
          {!shown.length && (
            <div className="mp-none">
              <Package size={28} />
            </div>
          )}
        </div>
      </section>
      {split.handle}

      <aside className={`mp-cart ${cartOpen ? "open" : ""}`}>
        <div className="mp-cart-head">
          <b>
            <ShoppingCart size={18} /> {p.cart}
          </b>
          <small>{p.items.replace("{n}", count)}</small>
          {held.length > 0 && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm mp-held-btn" onClick={() => setModal("held")} data-testid="mp-held">
              <PauseCircle size={14} /> {p.held} <em>{held.length}</em>
            </button>
          )}
          {cart.lines.length > 0 && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal("hold")} data-testid="mp-hold">
              <PauseCircle size={14} /> {p.hold}
            </button>
          )}
          {cart.lines.length > 0 && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => setModal("clear")}>
              <Trash2 size={14} /> {p.clear}
            </button>
          )}
          <button type="button" className="mp-x mp-cart-close" onClick={() => setCartOpen(false)} aria-label={p.close}>
            <X size={18} />
          </button>
        </div>
        <div className="mp-lines">
          {!cart.lines.length ? (
            <p className="mp-empty">
              <ScanBarcode size={30} />
              {p.emptyCart}
            </p>
          ) : (
            cart.lines.map((l) => (
              <div key={l.key} className="mp-line">
                <span className="mp-line-text">
                  <b>{l.name}</b>
                  <small>
                    {money(l.price, cur)}
                    {unitOf(l.product_id) ? ` / ${unitOf(l.product_id)}` : ""}
                  </small>
                </span>
                <span className="mp-qty">
                  <button type="button" onClick={() => setQty(l.key, l.qty - 1)} aria-label="-">
                    <Minus size={14} />
                  </button>
                  <input inputMode="decimal" value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} onFocus={(e) => e.target.select()} aria-label={p.qty} />
                  <button type="button" onClick={() => setQty(l.key, l.qty + 1)} aria-label="+">
                    <Plus size={14} />
                  </button>
                </span>
                <b className="mp-line-total">{money(l.price * l.qty, cur)}</b>
              </div>
            ))
          )}
        </div>
        <div className="mp-sum">
          {promo.applied.length > 0 && (
            <div className="mp-promos" data-testid="mp-promos">
              {promo.applied.map((a) => (
                <span key={a.id || a.name}>
                  <BadgePercent size={13} /> {a.name}
                  <b>−{money(a.amount, cur)}</b>
                </span>
              ))}
            </div>
          )}
          {(loyalty || promos.some((pr) => pr.code)) && (
            <div className="mp-extra">
              {loyalty && (
                <button type="button" className={`mp-disc-btn ${member ? "on" : ""}`} onClick={() => setModal("member")} disabled={!cart.lines.length} data-testid="mp-member">
                  <Gift size={15} />{" "}
                  {member ? `${member.name || member.phone} · ${x.pointsHave.replace("{n}", Math.round(member.points || 0))}${pointsAsked ? ` · −${money(sum.points_value, cur)}` : ""}${earn ? ` · ${x.willEarn.replace("{n}", earn)}` : ""}` : x.member}
                </button>
              )}
              {promos.some((pr) => pr.code) && (
                <button type="button" className={`mp-disc-btn ${cart.coupon ? "on" : ""}`} onClick={() => setModal("coupon")} disabled={!cart.lines.length} data-testid="mp-coupon">
                  <Ticket size={15} /> {cart.coupon ? `${x.coupon}: ${cart.coupon}` : x.coupon}
                </button>
              )}
            </div>
          )}
          <button type="button" className="mp-disc-btn" onClick={() => setModal("discount")} disabled={!cart.lines.length}>
            <BadgePercent size={15} /> {cart.discount ? `${p.discount}: −${money(sum.discount, cur)}${cart.discount.type === "pct" ? ` (${cart.discount.value}%)` : ""}` : p.addDiscount}
          </button>
          <div className="mp-total">
            <span>{p.total}</span>
            <b data-testid="mp-total">{money(sum.total, cur)}</b>
            {cur === "USD" && <small>{riel(sum.total_khr)}</small>}
          </div>
          <button type="button" className="mp-pay" onClick={() => setModal("pay")} disabled={!cart.lines.length || ctx.readOnly}>
            {p.pay} <kbd>F2</kbd>
          </button>
        </div>
      </aside>

      {cart.lines.length > 0 && !cartOpen && (
        <div className="mp-bar">
          <button type="button" className="mp-bar-cart" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={18} />
            <span>{p.items.replace("{n}", count)}</span>
            <b>{money(sum.total, cur)}</b>
          </button>
          <button type="button" className="mp-pay" onClick={() => setModal("pay")} disabled={ctx.readOnly}>
            {p.pay}
          </button>
        </div>
      )}

      {modal === "clear" && (
        <Modal
          title={p.clearSure}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setModal(null)}>
                {p.close}
              </button>
              <button
                type="button"
                className="md-btn md-btn-danger"
                onClick={() => {
                  reset();
                  setModal(null);
                }}
                autoFocus
              >
                <Trash2 size={15} /> {p.clear}
              </button>
            </>
          }
        >
          <p className="rs-muted" style={{ margin: 0 }}>
            {p.items.replace("{n}", count)} · {money(sum.total, cur)}
          </p>
        </Modal>
      )}
      {modal === "hold" && (
        <HoldModal
          p={p}
          n={held.length + 1}
          onClose={() => setModal(null)}
          onSave={(name) => {
            holdCart(name);
            reset();
            setModal(null);
            ctx.notify?.({ type: "success", text: p.heldSaved });
          }}
        />
      )}
      {modal === "held" && (
        <HeldModal
          p={p}
          cur={cur}
          list={held}
          busy={cart.lines.length > 0}
          onClose={() => setModal(null)}
          onOpen={(h) => {
            resumeCart(h);
            setModal(null);
          }}
          onRemove={(h) => setHeld((list) => list.filter((x) => x.id !== h.id))}
        />
      )}
      {modal === "discount" && <DiscountModal p={p} cur={cur} cart={cart} subtotal={sum.subtotal - sum.promo_discount} onClose={() => setModal(null)} onApply={(d) => setCart((c) => ({ ...c, discount: d }))} />}
      {modal === "member" && <MemberModal ctx={ctx} x={x} cart={cart} left={sum.subtotal - sum.promo_discount - sum.discount} onClose={() => setModal(null)} onApply={(mb, redeem) => setCart((c) => ({ ...c, member: mb, redeem }))} />}
      {modal === "coupon" && (
        <CouponModal
          x={x}
          cart={cart}
          check={(code) => applyPromos({ lines: cart.lines, promos, at: Date.now(), where: "pos", coupon: code, currency: cur, categoryOf }).coupon}
          onClose={() => setModal(null)}
          onApply={(code) => setCart((c) => ({ ...c, coupon: code }))}
        />
      )}
      {modal === "pay" && (
        <PayModal
          ctx={ctx}
          p={p}
          cart={cart}
          discount={sum.discount}
          promo={promo.discount}
          points={sum.points_value}
          extra={sellExtra}
          onQr={setPayQr}
          onClose={() => {
            setPayQr(null);
            setModal(null);
          }}
          onPaid={(sale, offline) => {
            setPayQr(null);
            thanks(sale);
            reset();
            setModal({ done: sale, offline });
          }}
        />
      )}
      {modal?.done && <DoneModal ctx={ctx} p={p} sale={modal.done} offline={modal.offline} onClose={() => setModal(null)} />}
      {modal === "camera" && (
        <CameraModal
          p={p}
          onCode={(code) => {
            setModal(null);
            enter(code);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.newProduct !== undefined && (
        <ProductModal
          ctx={ctx}
          row={{ barcode: modal.newProduct }}
          cats={boot.categories}
          onClose={() => setModal(null)}
          onSaved={async (prod) => {
            setMiss("");
            await ctx.reload();
            if (prod?._id) add({ _id: prod._id, name: prod.name, barcode: prod.barcode, price: prod.price, photo: prod.photo?.url || "" });
          }}
        />
      )}
    </div>
  );
}

function DiscountModal({ p, cur, cart, subtotal, onClose, onApply }) {
  const [type, setType] = useState(cart.discount?.type || "amt");
  const [value, setValue] = useState(cart.discount?.value ?? "");
  const v = Number(value);
  const ok = v > 0 && (type === "pct" ? v <= 100 : v <= subtotal);
  return (
    <Modal
      title={p.discount}
      onClose={onClose}
      footer={
        <>
          {cart.discount && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-danger-text"
              style={{ marginRight: "auto" }}
              onClick={() => {
                onApply(null);
                onClose();
              }}
            >
              {p.noDiscount}
            </button>
          )}
          <button type="submit" form="mp-disc" className="md-btn md-btn-primary" disabled={!ok}>
            {p.apply}
          </button>
        </>
      }
    >
      <form
        id="mp-disc"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          onApply({ type, value: v });
          onClose();
        }}
      >
        <div className="at-seg">
          {[
            ["amt", cur === "KHR" ? "៛" : "$"],
            ["pct", p.percent],
          ].map(([k, label]) => (
            <button key={k} type="button" className={type === k ? "on" : ""} onClick={() => setType(k)}>
              {label}
            </button>
          ))}
        </div>
        <input className="mp-big-input" type="number" min="0" step={type === "pct" ? "1" : cur === "KHR" ? "100" : "0.01"} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus aria-label={p.amount} />
      </form>
    </Modal>
  );
}

function PayModal({ ctx, p, cart, discount, promo = 0, points = 0, extra = {}, onQr, onClose, onPaid }) {
  const { m, cur } = ctx;
  const s = ctx.data.settings;
  const methods = [...(s.methods?.length ? s.methods : ["cash"]), ...(ctx.data.debt ? ["debt"] : [])]; // "debt" = the debt book add-on
  const [method, setMethod] = useState(methods.includes("cash") ? "cash" : methods[0]);
  const [debtor, setDebtor] = useState(null); // { _id } from the book, or { name, phone } typed now
  const [dq, setDq] = useState("");
  const debtors = ctx.data.debtors || [];
  const found = dq.trim() ? debtors.filter((d) => d.name.toLowerCase().includes(dq.trim().toLowerCase()) || (d.phone || "").includes(dq.trim())).slice(0, 6) : debtors.slice(0, 6);
  const [usd, setUsd] = useState("");
  const [khr, setKhr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const round = s.khr_round || 100;
  const mny = saleMoney({ lines: cart.lines, discount, promo, points, currency: cur, rate: s.khr_rate, method, paid_usd: Number(usd) || 0, paid_khr: Number(khr) || 0, khr_round: round });
  const nothing = method === "cash" && !(Number(usd) > 0) && !(Number(khr) > 0);
  const can = !busy && (method === "debt" ? !!(debtor?._id || debtor?.name) : method !== "cash" || nothing || mny.short === 0);
  const confirm = async () => {
    if (!can) return;
    setBusy(true);
    setError("");
    // nothing typed = the customer paid the exact amount
    const exact = method === "cash" && nothing;
    try {
      const r = await ctx.api.sell({
        items: cart.lines.map((l) => ({ product_id: l.product_id || null, name: l.name, barcode: l.barcode || "", price: l.price, qty: l.qty })),
        discount,
        ...extra,
        method,
        paid_usd: exact ? (cur === "USD" ? mny.total : 0) : Number(usd) || 0,
        paid_khr: exact ? (cur === "KHR" ? mny.total : 0) : Number(khr) || 0,
        ...(method === "debt" ? (debtor._id ? { debtor_id: debtor._id } : { new_debtor: { name: debtor.name, phone: debtor.phone || "" } }) : {}),
      });
      onPaid(r.data, !!r.offline);
    } catch (e) {
      setError(e.code === "short" ? p.short.replace("{amt}", money(e.response?.short || 0, cur)) : e.message);
      setBusy(false);
    }
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && !e.isComposing && e.target.tagName !== "BUTTON") {
        e.preventDefault();
        confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const addUsd = (n) => setUsd((v) => String(Math.round(((Number(v) || 0) + n) * 100) / 100));
  const addKhr = (n) => setKhr((v) => String((Number(v) || 0) + n));
  const split = cur === "USD" ? changeSplit(mny.change, s.khr_rate, round) : null;
  const own = customMethodOf(method); // a method the shop made (its own QR picture, or none)
  const qr = method !== "cash" && method !== "debt" && (own ? !!own.qr : ["aba", "khqr", "acleda", "wing"].includes(method));
  const qrImg = own ? own.qr : s.pay_qr;
  const qrLabel = own ? own.name : s.pay_qr_label;
  useEffect(() => {
    onQr?.(qr && qrImg ? { img: qrImg, label: qrLabel } : null);
  }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal title={p.pay} onClose={onClose} busy={busy} size="md-modal-lg mp-pay-modal">
      <div className="mp-paywrap">
        <div className="mp-due">
          <small>{p.total}</small>
          <b data-testid="mp-due">{money(mny.total, cur)}</b>
          {cur === "USD" && <span>{riel(mny.total_khr)}</span>}
        </div>
        <div className="mp-methods">
          {methods.map((k) => (
            <button key={k} type="button" className={method === k ? "on" : ""} onClick={() => setMethod(k)}>
              {customMethodOf(k)?.color && <i className="mp-mdot" style={{ background: customMethodOf(k).color }} />}
              {methodName(m, k)}
            </button>
          ))}
        </div>
        {method === "cash" ? (
          <>
            <div className="mp-cash">
              <label>
                <span>{p.usdIn}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="0" autoFocus={cur === "USD"} data-testid="mp-usd" />
                <div className="mp-quick">
                  {[1, 5, 10, 20, 50, 100].map((n) => (
                    <button key={n} type="button" onClick={() => addUsd(n)}>
                      +${n}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                <span>{p.khrIn}</span>
                <input type="number" min="0" step="100" inputMode="numeric" value={khr} onChange={(e) => setKhr(e.target.value)} placeholder="0" autoFocus={cur === "KHR"} data-testid="mp-khr" />
                <div className="mp-quick">
                  {[1000, 5000, 10000, 20000, 50000, 100000].map((n) => (
                    <button key={n} type="button" onClick={() => addKhr(n)}>
                      +{n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <div className="mp-quick mp-quick-row">
              <button
                type="button"
                onClick={() => {
                  if (cur === "USD") setUsd(String(mny.total));
                  else setKhr(String(mny.total));
                  if (cur === "USD") setKhr("");
                  else setUsd("");
                }}
              >
                {p.exact}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsd("");
                  setKhr("");
                }}
              >
                {p.reset}
              </button>
            </div>
            {!nothing && (
              <div className={`mp-change ${mny.short ? "short" : ""}`} data-testid="mp-change">
                {mny.short ? (
                  <b>{p.short.replace("{amt}", cur === "USD" ? `${money(mny.short, cur)} (${riel(Math.ceil((mny.short * s.khr_rate) / round) * round)})` : money(mny.short, cur))}</b>
                ) : (
                  <>
                    <small>{p.giveBack}</small>
                    <b>{cur === "USD" ? riel(mny.change_khr) : money(mny.change, cur)}</b>
                    {cur === "USD" && mny.change > 0 && (
                      <span>
                        = {money(mny.change, cur)}
                        {split.usd > 0 && split.khr > 0 ? ` · $${split.usd} + ${riel(split.khr)}` : ""}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        ) : method === "debt" ? (
          <div className="mp-debt">
            <b>{m.debtPickTitle}</b>
            {debtor ? (
              <div className="mp-debt-pick on">
                <span>
                  <b>{debtor.name}</b>
                  <small>{debtor._id ? (debtor.balance > 0 ? m.debtOwes.replace("{amt}", money(debtor.balance, cur)) : m.clear2) : m.debtNew}</small>
                </span>
                <button type="button" className="mp-x" onClick={() => setDebtor(null)} aria-label={p.close}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <label className="mt-search">
                  <Search size={16} />
                  <input value={dq} onChange={(e) => setDq(e.target.value)} placeholder={m.debtPick} autoFocus data-testid="mp-debt-q" />
                </label>
                <div className="mp-debt-list">
                  {found.map((d) => (
                    <button key={d._id} type="button" onClick={() => setDebtor(d)}>
                      <b>{d.name}</b>
                      <small>
                        {d.phone ? `${d.phone} · ` : ""}
                        {d.balance > 0 ? m.debtOwes.replace("{amt}", money(d.balance, cur)) : m.clear2}
                      </small>
                    </button>
                  ))}
                  {dq.trim() && !debtors.some((d) => d.name.toLowerCase() === dq.trim().toLowerCase()) && (
                    <button type="button" className="new" onClick={() => setDebtor({ name: dq.trim() })}>
                      <Plus size={14} /> <b>{m.debtNew}</b>
                      <small>“{dq.trim()}”</small>
                    </button>
                  )}
                </div>
              </>
            )}
            <small className="rs-muted">{m.debtConfirmHint}</small>
          </div>
        ) : qr ? (
          <div className="mp-qr">
            {qrImg ? (
              <>
                <img src={qrImg} alt="QR" />
                <small>{qrLabel}</small>
                <span>{p.scanQr}</span>
              </>
            ) : (
              <span className="rs-muted">{p.noQr}</span>
            )}
          </div>
        ) : null}
        {error && <div className="md-form-error">{error}</div>}
        <button type="button" className="mp-pay mp-confirm" onClick={confirm} disabled={!can} data-testid="mp-confirm">
          <Check size={20} /> {p.confirm}
        </button>
      </div>
    </Modal>
  );
}

function DoneModal({ ctx, p, sale, offline, onClose }) {
  const { m, cur, lang } = ctx;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const split = cur === "USD" && sale.change > 0 ? changeSplit(sale.change, sale.khr_rate, ctx.data.settings.khr_round || 100) : null;
  const pr = printOf(ctx);
  const print = () => printReceipt({ sale, shop: ctx.shop, m, lang, size: pr.size, theme: pr.theme });
  useEffect(() => {
    if (pr.on && pr.auto) print();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal
      title={`${p.paidOk} · ${sale.no}`}
      onClose={onClose}
      footer={
        <>
          {pr.on ? (
            <button type="button" className="md-btn md-btn-ghost" onClick={print}>
              <Printer size={15} /> {p.print}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => ctx.notify({ type: "error", text: m.printLocked })} title={m.printLocked}>
              <Lock size={15} /> {p.print}
            </button>
          )}
          <button type="button" className="md-btn md-btn-primary" onClick={onClose} autoFocus>
            {p.newSale} ↵
          </button>
        </>
      }
    >
      {sale.method === "cash" && sale.change > 0 && (
        <div className="mp-change big">
          <small>{p.giveBack}</small>
          <b>{cur === "USD" ? riel(sale.change_khr) : money(sale.change, cur)}</b>
          {split && (
            <span>
              = {money(sale.change, cur)}
              {split.usd > 0 && split.khr > 0 ? ` · $${split.usd} + ${riel(split.khr)}` : ""}
            </span>
          )}
        </div>
      )}
      {offline && (
        <p className="mp-off-note">
          <CloudOff size={15} /> {p.savedOffline}
        </p>
      )}
      <ReceiptView sale={sale} shop={ctx.shop} m={m} lang={lang} theme={pr.theme} size={pr.size} />
    </Modal>
  );
}

// camera scanning (Chrome / Android have BarcodeDetector); USB scanners work everywhere through the scan box
function CameraModal({ p, onCode, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState("BarcodeDetector" in window ? "" : p.cameraNo);
  useEffect(() => {
    if (!("BarcodeDetector" in window)) return undefined;
    let stream;
    let stop = false;
    (async () => {
      try {
        const want = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];
        const have = (await window.BarcodeDetector.getSupportedFormats?.()) || want;
        const detector = new window.BarcodeDetector({ formats: want.filter((f) => have.includes(f)) });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stop) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              navigator.vibrate?.(60);
              onCode(found[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          setTimeout(tick, 200);
        };
        tick();
      } catch {
        setError(p.cameraNo);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, p.cameraNo]);
  return (
    <Modal title={p.scanCamera} onClose={onClose}>
      {error ? (
        <p className="rs-muted">{error}</p>
      ) : (
        <div className="mp-camera">
          <video ref={video} playsInline muted />
          <i />
          <small>{p.cameraHint}</small>
        </div>
      )}
    </Modal>
  );
}

function HoldModal({ p, n, onClose, onSave }) {
  const [name, setName] = useState("");
  return (
    <Modal
      title={p.holdTitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {p.close}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => onSave(name)} data-testid="mp-hold-save">
            <PauseCircle size={15} /> {p.holdSave}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {p.holdSub}
      </p>
      <label className="md-field">
        <span>{p.holdName}</span>
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder={p.holdDefault.replace("{n}", n)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave(name);
            }
          }}
        />
      </label>
    </Modal>
  );
}

function HeldModal({ p, cur, list, busy, onClose, onOpen, onRemove }) {
  const when = (d) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));
  return (
    <Modal title={p.heldTitle} onClose={onClose}>
      {!list.length ? (
        <p className="rs-muted">{p.heldEmpty}</p>
      ) : (
        <div className="mp-held">
          {busy && <p className="rs-muted mp-held-hint">{p.swapHint}</p>}
          {list.map((h) => {
            const qty = h.lines.reduce((a, l) => a + l.qty, 0);
            const total = h.lines.reduce((a, l) => a + l.price * l.qty, 0);
            return (
              <div key={h.id} className="mp-held-row">
                <span className="mp-held-ic">
                  <PauseCircle size={18} />
                </span>
                <span className="mp-held-text">
                  <b>{h.name}</b>
                  <small>
                    {when(h.at)} · {p.items.replace("{n}", qty)} ·{" "}
                    {h.lines
                      .map((l) => l.name)
                      .slice(0, 3)
                      .join(", ")}
                    {h.lines.length > 3 ? "…" : ""}
                  </small>
                </span>
                <b className="mp-held-total">{money(total, cur)}</b>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => onOpen(h)} data-testid="mp-resume">
                  {p.resume}
                </button>
                <button type="button" className="md-icon-btn" onClick={() => onRemove(h)} aria-label={p.clear}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// loyalty (mart_loyalty): the customer's phone → their points; use some now
function MemberModal({ ctx, x, cart, left, onClose, onApply }) {
  const { cur } = ctx;
  const rules = ctx.data.loyalty;
  const [phone, setPhone] = useState(cart.member?.phone || "");
  const [found, setFound] = useState(cart.member?._id ? cart.member : null);
  const [looked, setLooked] = useState(!!cart.member);
  const [name, setName] = useState(cart.member && !cart.member._id ? cart.member.name || "" : "");
  const [redeem, setRedeem] = useState(cart.redeem ? String(cart.redeem) : "");
  const digits = phone.replace(/\D/g, "");
  useEffect(() => {
    if (digits.length < 8) {
      setFound(null);
      setLooked(false);
      return undefined;
    }
    const t = setTimeout(() => {
      ctx.api
        .lookupMember(ctx.id, digits)
        .then((r) => {
          setFound(r.data || null);
          setLooked(true);
        })
        .catch(() => setLooked(true));
    }, 250);
    return () => clearTimeout(t);
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps
  const have = Math.floor(found?.points || 0);
  const maxUse = rules.point_value > 0 ? Math.min(have, Math.ceil(left / rules.point_value - 1e-9)) : 0;
  const n = Math.floor(Number(redeem) || 0);
  const okRedeem = !n || (found && n >= rules.min_redeem && n <= have);
  const ok = digits.length >= 8 && looked && okRedeem;
  return (
    <Modal
      title={x.member}
      onClose={onClose}
      footer={
        <>
          {cart.member && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-danger-text"
              style={{ marginRight: "auto" }}
              onClick={() => {
                onApply(null, 0);
                onClose();
              }}
            >
              {x.remove}
            </button>
          )}
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={!ok}
            onClick={() => {
              onApply(found ? { _id: found._id, phone: found.phone, name: found.name, points: found.points } : { phone: digits, name: name.trim(), points: 0 }, found ? n : 0);
              onClose();
            }}
            data-testid="mp-member-ok"
          >
            <Check size={15} /> {x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <input className="mp-big-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={x.memberPh} autoFocus aria-label={x.memberPh} data-testid="mp-member-phone" />
        {found ? (
          <div className="mp-member-card">
            <Gift size={18} />
            <span>
              <b>{found.name || found.phone}</b>
              <small>
                {x.pointsHave.replace("{n}", have)} {rules.point_value > 0 ? x.pointsWorth.replace("{amt}", money(have * rules.point_value, cur)) : ""}
              </small>
            </span>
          </div>
        ) : looked && digits.length >= 8 ? (
          <label className="md-field">
            <span>
              {x.newMember} · {x.name}
            </span>
            <input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        ) : null}
        {found && have >= rules.min_redeem && maxUse > 0 && (
          <div className="mp-redeem">
            <label className="md-field">
              <span>
                {x.usePoints} (≥ {rules.min_redeem})
              </span>
              <input type="number" min="0" max={maxUse} value={redeem} onChange={(e) => setRedeem(e.target.value)} data-testid="mp-redeem" />
            </label>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRedeem(String(maxUse))}>
              {maxUse} = −{money(Math.min(left, maxUse * rules.point_value), cur)}
            </button>
          </div>
        )}
        {!okRedeem && (
          <div className="md-form-error">
            ≥ {rules.min_redeem} · ≤ {have}
          </div>
        )}
      </div>
    </Modal>
  );
}

// a coupon code (mart_promos)
function CouponModal({ x, cart, check, onClose, onApply }) {
  const [code, setCode] = useState(cart.coupon || "");
  const [state, setState] = useState("");
  const apply = () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      onApply("");
      onClose();
      return;
    }
    const st = check(c);
    if (st !== "ok") return setState(st);
    onApply(c);
    onClose();
  };
  return (
    <Modal
      title={x.coupon}
      onClose={onClose}
      footer={
        <>
          {cart.coupon && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-danger-text"
              style={{ marginRight: "auto" }}
              onClick={() => {
                onApply("");
                onClose();
              }}
            >
              {x.remove}
            </button>
          )}
          <button type="button" className="md-btn md-btn-primary" onClick={apply} data-testid="mp-coupon-ok">
            <Check size={15} /> {x.save}
          </button>
        </>
      }
    >
      <input
        className="mp-big-input"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setState("");
        }}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder={x.couponPh}
        autoFocus
        aria-label={x.couponPh}
        data-testid="mp-coupon-code"
      />
      {state && (
        <div className="md-form-error" style={{ marginTop: 10 }}>
          {x.couponBad[state] || x.couponBad.invalid}
        </div>
      )}
    </Modal>
  );
}
