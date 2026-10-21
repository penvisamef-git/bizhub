import { ChefHat, Plus, ShoppingBag } from "lucide-react";
import "../../../public/menu.css";
import "../../../public/order.css";
import "../../../public/order-themes.css";

const SAMPLE = [
  ["Iced latte", "ឡាតេទឹកកក", 2.5, "linear-gradient(135deg,#c8a27c,#7a4f32)"],
  ["Mango smoothie", "ក្រឡុកស្វាយ", 2.75, "linear-gradient(135deg,#ffd166,#f08a24)"],
  ["Fried rice", "បាយឆា", 3.5, "linear-gradient(135deg,#f4d58d,#c47f2c)"],
];

// a small, made-up guest page in one look (uses the real page's styles)
export default function OrderThemeMock({ theme, color, name, logo, lang }) {
  const km = lang === "km";
  return (
    <div className="otm" aria-hidden="true">
      <div className={`mn mo mo-t-${theme} otm-page`} style={{ "--c": color }}>
        <header className="mn-hero">
          <div className="mn-hero-in" style={{ padding: "26px 16px 26px" }}>
            <span className="mn-logo">{logo ? <img src={logo} alt="" /> : <ChefHat size={30} />}</span>
            <h1>{name}</h1>
          </div>
        </header>
        <div className="mn-table mo-table">
          {km ? "តុ" : "Table"} <b>A3</b>
        </div>
        <div className="mo-tabs">
          <button type="button" className="on" tabIndex={-1}>
            {km ? "ម៉ឺនុយ" : "Menu"}
          </button>
          <button type="button" tabIndex={-1}>
            {km ? "វិក្កយបត្រតុ" : "Table bill"}
          </button>
        </div>
        <main className="mn-main">
          <section className="mn-section">
            <h2>
              <i style={{ background: color }} /> {km ? "ភេសជ្ជៈ" : "Drinks"}
            </h2>
            <div className="mn-items">
              {SAMPLE.map(([en, kh, p, bg], i) => (
                <div key={en} className="mn-item mo-item">
                  <span className="mn-item-text">
                    <b>{km ? kh : en}</b>
                    <small>{km ? en : kh}</small>
                    <span className="mn-price">
                      ${p.toFixed(2)} <em>{new Intl.NumberFormat("en-US").format(Math.round((p * 4100) / 100) * 100)}៛</em>
                    </span>
                  </span>
                  <span className="otm-photo" style={{ background: bg }} />
                  <span className={`mo-add ${i === 0 ? "has" : ""}`}>{i === 0 ? 2 : <Plus size={18} />}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
        <div className="mo-bar otm-bar">
          <button type="button" tabIndex={-1}>
            <ShoppingBag size={19} />
            <span>{km ? "មើលការកុម្ម៉ង់ · 2 មុខ" : "View order · 2 items"}</span>
            <b>$5.00</b>
          </button>
        </div>
      </div>
    </div>
  );
}
