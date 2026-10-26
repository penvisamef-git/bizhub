import { Apple, BedDouble, BellRing, Check, ChefHat, Clock, Coffee, Cookie, Gift, Fingerprint, KeyRound, Link2, MapPin, MessageSquareText, Milk, Phone, QrCode, Send, ShoppingBasket, Sparkles, UserPlus } from "lucide-react";
import "./bizscene.css";

// A small looping picture under the type's description in "Add business": shows what the type does.
// Pure CSS animation; a new type without its own scene gets the generic one. Still picture when the phone asks for less motion.
const W = {
  en: { owes: "Owes", paid: "Paid", remind: "Reminder sent", publish: "Publish", saved: "Contact saved", menu: "Menu", total: "Total", in: "In", room: "Room", rooms: "Booked", scan: "Scan me", t: "Table", free: "Free coffee!", shared: "Shared · 3 replies", order: "New order", accept: "Accept", accepted: "Accepted" },
  km: { owes: "ជំពាក់", paid: "សងរួច", remind: "បានផ្ញើការរំលឹក", publish: "ផ្សព្វផ្សាយ", saved: "បានរក្សាទុកលេខ", menu: "ម៉ឺនុយ", total: "សរុប", in: "ចូល", room: "បន្ទប់", rooms: "បានកក់", scan: "ស្កេន", t: "តុ", free: "កាហ្វេឥតគិតថ្លៃ!", shared: "បានចែករំលែក · ឆ្លើយ 3", order: "ការកម្ម៉ង់ថ្មី", accept: "ទទួល", accepted: "បានទទួល" },
};

// a fixed 7×7 QR-looking pattern (1 = dark)
const QR = "1110111101010111101011100101000110101110100101110".split("");
const QrCells = ({ stagger }) => (
  <span className="bs-qr">
    {QR.map((c, i) => (
      <i key={i} className={c === "1" ? "on" : ""} style={stagger ? { animationDelay: `${(i * 37) % 900}ms` } : undefined} />
    ))}
  </span>
);

function NameCard({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-ncard">
        <span className="bs-ncard-av">D</span>
        <span className="bs-lines">
          <b />
          <i />
          <i className="short" />
        </span>
        <span className="bs-ncard-qr">
          <QrCode size={22} />
        </span>
        <span className="bs-ncard-btns">
          <span>
            <Phone size={12} />
          </span>
          <span>
            <Send size={12} />
          </span>
          <span>
            <MapPin size={12} />
          </span>
        </span>
      </div>
      <span className="bs-toast">
        <UserPlus size={14} /> {w.saved}
      </span>
    </div>
  );
}

function MenuQr({ w }) {
  return (
    <div className="bs-row">
      <span className="bs-scanbox">
        <QrCells />
        <span className="bs-beam" />
      </span>
      <span className="bs-arrow" />
      <span className="bs-phone">
        <small>{w.menu}</small>
        {["#f59e0b", "#16a34a", "#dc2626", "#0ea5e9"].map((c, i) => (
          <span key={c} className="bs-dish" style={{ "--c": c, animationDelay: `${0.9 + i * 0.35}s` }}>
            <i />
            <b />
            <em />
          </span>
        ))}
      </span>
    </div>
  );
}

function FlipBook() {
  return (
    <div className="bs-row">
      <div className="bs-book">
        <span className="bs-page left">
          <i />
          <i />
          <i className="short" />
          <span className="bs-pic" />
        </span>
        <span className="bs-page right">
          <span className="bs-pic" />
          <i />
          <i />
          <i className="short" />
        </span>
        <span className="bs-page flip" />
        <span className="bs-page flip two" />
      </div>
    </div>
  );
}

function QrGen({ w }) {
  return (
    <div className="bs-row">
      <span className="bs-scanbox big">
        <QrCells stagger />
        <span className="bs-corners" />
        <span className="bs-beam" />
      </span>
      <span className="bs-link">
        <Link2 size={14} /> bizhub.link/x/<b>sokha</b>
      </span>
    </div>
  );
}

function Restaurant({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-tables">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <span key={n} className={`bs-table n${n}`}>
            {w.t} {n}
          </span>
        ))}
      </div>
      <div className="bs-printer">
        <span className="bs-bell">
          <BellRing size={16} />
        </span>
        <span className="bs-slot" />
        <span className="bs-paper">
          <span className="bs-ticket">
            <ChefHat size={14} />
            <i />
            <i />
            <i className="short" />
          </span>
        </span>
      </div>
    </div>
  );
}

function Attendance({ w }) {
  return (
    <div className="bs-row">
      <span className="bs-finger">
        <Fingerprint size={40} />
        <span className="bs-ring" />
        <span className="bs-beam" />
      </span>
      <div className="bs-staff">
        {[
          ["S", "07:58", "#f97316"],
          ["V", "08:01", "#0ea5e9"],
          ["K", "08:03", "#a855f7"],
        ].map(([a, t, c], i) => (
          <span key={a} className="bs-in" style={{ "--c": c, animationDelay: `${0.6 + i * 0.7}s` }}>
            <b>{a}</b>
            <i />
            <small>
              <Clock size={11} /> {t}
            </small>
            <Check size={14} className="ok" />
          </span>
        ))}
      </div>
    </div>
  );
}

function GuestHouse({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-rooms">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="bs-room" style={{ animationDelay: `${[0, 3, 6, 1, 8, 4, 2, 9, 5, 7][i] * 0.28}s` }}>
            <BedDouble size={13} />
            <small>{101 + i}</small>
          </span>
        ))}
      </div>
      <span className="bs-key">
        <KeyRound size={26} />
      </span>
    </div>
  );
}

function Mart({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-cart">
        <span className="bs-drop d1">
          <Apple size={18} />
        </span>
        <span className="bs-drop d2">
          <Milk size={18} />
        </span>
        <span className="bs-drop d3">
          <Cookie size={18} />
        </span>
        <span className="bs-basket">
          <ShoppingBasket size={44} />
        </span>
      </div>
      <div className="bs-till">
        <span className="bs-bars">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ width: [2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 3, 1, 2][i] }} />
          ))}
          <span className="bs-laser" />
        </span>
        <span className="bs-total">
          <small>{w.total}</small>
          <b className="v1">$1.25</b>
          <b className="v2">$3.75</b>
          <b className="v3">$5.20</b>
        </span>
      </div>
    </div>
  );
}

function Generic() {
  return (
    <div className="bs-row">
      <span className="bs-spark">
        <Sparkles size={34} />
      </span>
    </div>
  );
}

function Website({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-browser">
        <span className="bs-bar">
          <i />
          <i />
          <i />
          <em>/site/sokha</em>
        </span>
        <span className="bs-wb hero" />
        <span className="bs-wb-row">
          <span className="bs-wb card c1" />
          <span className="bs-wb card c2" />
          <span className="bs-wb card c3" />
        </span>
        <span className="bs-wb lines" />
      </div>
      <span className="bs-publish">
        <Check size={14} /> {w.publish}
      </span>
    </div>
  );
}

// Debt Book: names with what they owe; one pays (turns green), then a Telegram reminder goes out
function DebtBook({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-ledger">
        <span className="bs-led r1">
          <i>S</i>
          <b />
          <em>$25</em>
        </span>
        <span className="bs-led r2">
          <i>D</i>
          <b />
          <em className="pay">
            <span className="o">20,000៛</span>
            <span className="p">✓ {w.paid}</span>
          </em>
        </span>
        <span className="bs-led r3">
          <i>V</i>
          <b />
          <em>$8.50</em>
        </span>
      </div>
      <span className="bs-publish bs-remind">
        <BellRing size={14} /> {w.remind}
      </span>
    </div>
  );
}

// stamps land one by one, the last slot is the gift
function StampCardScene({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-stampcard">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`bs-stamp s${i}`}>
            {i < 4 ? <Coffee size={15} /> : <Gift size={15} />}
          </span>
        ))}
      </div>
      <span className="bs-publish">
        <Gift size={14} /> {w.free}
      </span>
    </div>
  );
}

// Digital Note: a note with a checklist, two replies slide in under it, then "Shared"
function NoteScene({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-note">
        <b className="t" />
        <span className="ck on">
          <Check size={9} />
          <b />
        </span>
        <span className="ck">
          <i />
          <b />
        </span>
        <span className="rp r1">
          <i>S</i>
          <b />
        </span>
        <span className="rp r2">
          <i>D</i>
          <b />
        </span>
      </div>
      <span className="bs-publish">
        <MessageSquareText size={14} /> {w.shared}
      </span>
    </div>
  );
}

// Telegram Store: an order lands in the staff group with buttons; Accept is pressed
function TgStoreScene({ w }) {
  return (
    <div className="bs-row">
      <div className="bs-tgchat">
        <span className="bs-tgmsg">
          <b>
            🆕 {w.order} #12
          </b>
          <i />
          <i className="short" />
          <em>$4.50 · KHQR</em>
        </span>
        <span className="bs-tgkeys">
          <span className="k1">
            <Check size={10} /> {w.accept}
          </span>
          <span>15′</span>
        </span>
      </div>
      <span className="bs-publish">
        <Send size={14} /> {w.accepted}
      </span>
    </div>
  );
}

const SCENES = { tg_store: TgStoreScene, digital_note: NoteScene, stamp_card: StampCardScene, debt_book: DebtBook, website: Website, namecard: NameCard, menu_qr: MenuQr, flipbook: FlipBook, qr_gen: QrGen, restaurant: Restaurant, attendance: Attendance, guest_house: GuestHouse, mart: Mart };

export default function BizTypeScene({ type, lang }) {
  const Scene = SCENES[type] || Generic;
  return (
    <div key={type} className={`bs bs-${type}`} aria-hidden="true" data-testid="biz-scene">
      <Scene w={W[lang] || W.en} />
    </div>
  );
}
