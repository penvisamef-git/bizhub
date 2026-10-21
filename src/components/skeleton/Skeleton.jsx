import "./skeleton.css";

// Grey shimmering shapes shown while a page loads, so people see something is coming.
export function Skel({ w = "100%", h = 14, r = 8, className = "", style }) {
  return <span className={`sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

function Busy({ children, className = "" }) {
  return (
    <div className={`sk-wrap ${className}`} role="status" aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

// Inside the app (any menu page): title, 4 tiles, two panels
export function PageSkeleton() {
  return (
    <Busy className="sk-page">
      <div className="sk-col" style={{ gap: 10 }}>
        <Skel w="38%" h={26} />
        <Skel w="58%" h={14} />
      </div>
      <div className="sk-tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk-panel sk-col" style={{ gap: 12 }}>
            <Skel w="50%" h={12} />
            <Skel w="40%" h={26} />
          </div>
        ))}
      </div>
      <div className="sk-two">
        <div className="sk-panel">
          <ListSkeleton rows={4} bare />
        </div>
        <div className="sk-panel">
          <ListSkeleton rows={3} bare />
        </div>
      </div>
    </Busy>
  );
}

// A list of rows with a round picture and two lines
export function ListSkeleton({ rows = 4, bare = false }) {
  const list = (
    <ul className="sk-list">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <Skel w={44} h={44} r={14} />
          <span className="sk-col">
            <Skel w={`${60 - (i % 3) * 12}%`} h={14} />
            <Skel w={`${36 + (i % 2) * 14}%`} h={11} />
          </span>
          <Skel w={70} h={30} r={10} />
        </li>
      ))}
    </ul>
  );
  return bare ? list : <Busy>{list}</Busy>;
}

// Table body rows (put inside <tbody>)
export function TableSkeletonRows({ cols = 5, rows = 6 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={`sk-${i}`} className="sk-tr" aria-hidden="true">
      {Array.from({ length: cols }, (_, j) => (
        <td key={j}>
          {j === 0 ? (
            <span className="sk-cell-person">
              <Skel w={34} h={34} r={999} />
              <Skel w="70%" h={12} />
            </span>
          ) : (
            <Skel w={`${50 + ((i + j) % 3) * 15}%`} h={12} />
          )}
        </td>
      ))}
    </tr>
  ));
}

// Name card / portfolio editor: form panels + phone preview
export function EditorSkeleton({ tabs = false }) {
  return (
    <Busy className="sk-page">
      <div className="sk-col" style={{ gap: 10 }}>
        <Skel w={110} h={12} />
        <Skel w="30%" h={26} />
      </div>
      {tabs && <Skel w={240} h={44} r={16} />}
      <div className="sk-editor">
        <div className="sk-col" style={{ gap: 18 }}>
          <div className="sk-panel">
            <Skel w="22%" h={18} />
            <div className="sk-thumbs">
              {[0, 1, 2].map((i) => (
                <Skel key={i} h={150} r={14} />
              ))}
            </div>
          </div>
          <div className="sk-panel sk-col" style={{ gap: 14 }}>
            <Skel w="18%" h={18} />
            <Skel h={42} r={12} />
            <div className="sk-two-tight">
              <Skel h={42} r={12} />
              <Skel h={42} r={12} />
            </div>
            <Skel h={96} r={12} />
          </div>
        </div>
        <div className="sk-phone">
          <Skel h={160} r={26} />
          <div className="sk-col" style={{ alignItems: "center", gap: 10, marginTop: -40 }}>
            <Skel w={96} h={96} r={999} style={{ border: "5px solid #eceef2" }} />
            <Skel w="55%" h={20} />
            <Skel w="40%" h={12} />
          </div>
          <div className="sk-col" style={{ gap: 8, marginTop: 18 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skel key={i} h={52} r={16} />
            ))}
          </div>
        </div>
      </div>
    </Busy>
  );
}

// Restaurant (and other business) dashboard: back link, logo + name + chips, tab bar, panels
export function BusinessSkeleton({ tabs = 8 }) {
  return (
    <Busy className="sk-page">
      <Skel w={110} h={12} />
      <div className="sk-row" style={{ gap: 14, alignItems: "center" }}>
        <Skel w={58} h={58} r={16} />
        <span className="sk-col" style={{ gap: 10, flex: 1 }}>
          <Skel w="min(260px, 60%)" h={24} />
          <span className="sk-row" style={{ gap: 8 }}>
            <Skel w={84} h={22} r={999} />
            <Skel w={120} h={22} r={999} />
            <Skel w={84} h={22} r={999} />
          </span>
        </span>
      </div>
      <div className="sk-panel sk-row sk-tabbar">
        {Array.from({ length: tabs }, (_, i) => (
          <Skel key={i} w={i === 0 ? 92 : 78} h={30} r={10} />
        ))}
      </div>
      <TabSkeleton />
    </Busy>
  );
}

// One tab of the business dashboard: a big panel and a list panel
export function TabSkeleton() {
  return (
    <div className="sk-col" style={{ gap: 18 }} aria-hidden="true">
      <div className="sk-panel sk-row" style={{ gap: 22, alignItems: "center" }}>
        <Skel w={96} h={96} r={999} />
        <span className="sk-col" style={{ gap: 10, flex: 1 }}>
          <Skel w="40%" h={20} />
          <Skel w="70%" h={12} />
          <Skel w="55%" h={12} />
        </span>
      </div>
      <div className="sk-panel">
        <ListSkeleton rows={4} bare />
      </div>
    </div>
  );
}

// Public name card page
export function CardPageSkeleton() {
  return (
    <Busy className="sk-public">
      <div className="sk-card">
        <Skel h={170} r={0} />
        <div className="sk-col" style={{ alignItems: "center", gap: 10, marginTop: -60, padding: "0 24px 24px" }}>
          <Skel w={120} h={120} r={999} style={{ border: "5px solid #fff" }} />
          <Skel w="60%" h={24} />
          <Skel w="42%" h={14} />
          <Skel w="80%" h={12} style={{ marginTop: 8 }} />
          <div className="sk-col" style={{ gap: 8, width: "100%", marginTop: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skel key={i} h={56} r={16} />
            ))}
          </div>
        </div>
      </div>
    </Busy>
  );
}

// Public portfolio page
export function PortfolioPageSkeleton() {
  return (
    <Busy className="sk-portfolio">
      <div className="sk-hero">
        <Skel w={130} h={130} r={32} className="sk-on-dark" />
        <div className="sk-col" style={{ gap: 12, flex: 1, minWidth: 0 }}>
          <Skel w="55%" h={36} className="sk-on-dark" />
          <Skel w="38%" h={16} className="sk-on-dark" />
          <div className="sk-row">
            {[0, 1, 2].map((i) => (
              <Skel key={i} w={120} h={34} r={999} className="sk-on-dark" />
            ))}
          </div>
        </div>
      </div>
      <div className="sk-pf-main">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-panel sk-col" style={{ gap: 12 }}>
            <Skel w="28%" h={18} />
            <Skel w="92%" h={12} />
            <Skel w="78%" h={12} />
            <Skel w="60%" h={12} />
          </div>
        ))}
      </div>
    </Busy>
  );
}

// Very first load (before the app shell exists)
export function FullPageSkeleton() {
  return (
    <Busy className="sk-full">
      <div className="sk-full-side">
        <Skel h={56} r={20} />
        <Skel h={64} r={20} />
        <div className="sk-panel sk-col" style={{ gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} h={18} w={`${70 - i * 8}%`} />
          ))}
        </div>
      </div>
      <div className="sk-full-main">
        <PageSkeleton />
      </div>
    </Busy>
  );
}

// a chat while it loads: message bubbles on both sides (them on the left with a photo, me on the right)
const CHAT_ROWS = [
  ["them", "62%", 2],
  ["me", "44%", 1],
  ["them", "38%", 1],
  ["me", "58%", 2],
  ["them", "50%", 1],
];
export function ChatSkeleton({ rows = 5 }) {
  return (
    <Busy className="sk-chat">
      {CHAT_ROWS.slice(0, rows).map(([who, w, lines], i) => (
        <div key={i} className={`sk-msg ${who}`}>
          {who === "them" && <Skel w={30} h={30} r={999} />}
          <div className="sk-bubble" style={{ width: w }}>
            {Array.from({ length: lines }, (_, j) => (
              <Skel key={j} h={12} w={j === lines - 1 && lines > 1 ? "60%" : "100%"} />
            ))}
            <Skel h={9} w={40} className="sk-msg-time" />
          </div>
        </div>
      ))}
    </Busy>
  );
}

// a list of chats (the super admin inbox) while it loads
export function ChatListSkeleton({ rows = 6 }) {
  return (
    <Busy className="sk-chat-list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-row" style={{ gap: 10, padding: "10px 4px", alignItems: "center" }}>
          <Skel w={38} h={38} r={999} />
          <div className="sk-col" style={{ flex: 1 }}>
            <Skel h={13} w={i % 2 ? "55%" : "70%"} />
            <Skel h={11} w={i % 3 ? "85%" : "60%"} />
          </div>
          <Skel w={34} h={10} />
        </div>
      ))}
    </Busy>
  );
}

// Buy coins (Licenses → Coins): the header, the coin packages, the cart and the past orders
export function CoinShopSkeleton() {
  return (
    <Busy className="sk-coins">
      <div className="sk-panel sk-row" style={{ gap: 14, alignItems: "center" }}>
        <Skel w={56} h={56} r={999} />
        <div className="sk-col" style={{ flex: 1, gap: 8 }}>
          <Skel w="32%" h={20} />
          <Skel w="56%" h={12} />
        </div>
      </div>
      <div className="sk-coin-layout">
        <div className="sk-coin-packs">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="sk-panel sk-coin-pack">
              <Skel w={44} h={44} r={999} />
              <Skel w="55%" h={22} />
              <Skel w="35%" h={11} />
              <Skel w="60%" h={18} r={999} />
              <Skel w="40%" h={18} />
              <Skel w="80%" h={32} r={10} />
            </div>
          ))}
        </div>
        <div className="sk-panel sk-col" style={{ gap: 12 }}>
          <Skel w="45%" h={16} />
          <Skel h={44} r={12} />
          <Skel h={44} r={12} />
          <Skel w="60%" h={13} />
          <Skel h={42} r={12} />
        </div>
      </div>
      <div className="sk-panel">
        <Skel w="28%" h={16} style={{ marginBottom: 12 }} />
        <ListSkeleton rows={3} bare />
      </div>
    </Busy>
  );
}

// Cards with a picture on the left (coin orders waiting for the team, payment screenshots…)
export function OrderCardsSkeleton({ rows = 4 }) {
  return (
    <Busy className="sk-orders">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-order">
          <Skel w={72} h={72} r={12} />
          <div className="sk-col" style={{ flex: 1, gap: 8 }}>
            <div className="sk-row" style={{ gap: 8, alignItems: "center" }}>
              <Skel w={70} h={14} />
              <Skel w={64} h={18} r={999} />
              <Skel w={90} h={11} />
            </div>
            <Skel w={`${58 - (i % 3) * 10}%`} h={13} />
            <Skel w={`${40 + (i % 2) * 12}%`} h={11} />
            <div className="sk-row" style={{ gap: 8 }}>
              <Skel w={96} h={32} r={10} />
              <Skel w={80} h={32} r={10} />
              <Skel w={72} h={32} r={10} />
            </div>
          </div>
        </div>
      ))}
    </Busy>
  );
}

// Settings made of panels with fields (hotline, packages, banks, Telegram…)
export function SettingsSkeleton({ panels = 3 }) {
  return (
    <Busy className="sk-settings">
      {Array.from({ length: panels }, (_, p) => (
        <div key={p} className="sk-panel sk-col" style={{ gap: 12 }}>
          <Skel w={`${30 + (p % 2) * 12}%`} h={16} />
          <Skel w="55%" h={11} />
          <div className="sk-field-grid">
            {Array.from({ length: p === 1 ? 6 : 4 }, (_, i) => (
              <div key={i} className="sk-col" style={{ gap: 6 }}>
                <Skel w="40%" h={10} />
                <Skel h={38} r={10} />
              </div>
            ))}
          </div>
          <Skel w={100} h={34} r={10} />
        </div>
      ))}
    </Busy>
  );
}

// the whole support chat page while it opens: header, messages, the box to write in
export function ChatPageSkeleton() {
  return (
    <Busy className="sk-chat-page">
      <div className="sk-panel sk-row" style={{ gap: 12, alignItems: "center" }}>
        <Skel w={44} h={44} r={999} />
        <div className="sk-col" style={{ gap: 8, flex: 1 }}>
          <Skel w="26%" h={18} />
          <Skel w="44%" h={11} />
        </div>
      </div>
      <div className="sk-panel sk-col" style={{ gap: 12 }}>
        <ChatSkeleton />
        <div className="sk-row" style={{ gap: 8, alignItems: "center" }}>
          <Skel w={36} h={36} r={999} />
          <Skel h={42} r={999} style={{ flex: 1 }} />
          <Skel w={42} h={42} r={999} />
        </div>
      </div>
    </Busy>
  );
}
// the super admin inbox while it opens: chats on the left, one chat on the right
export function InboxPageSkeleton() {
  return (
    <Busy className="sk-chat-page">
      <div className="sk-panel sk-col" style={{ gap: 8 }}>
        <Skel w="22%" h={20} />
        <Skel w="40%" h={11} />
      </div>
      <div className="sk-inbox">
        <div className="sk-panel sk-col" style={{ gap: 10 }}>
          <Skel h={38} r={999} />
          <div className="sk-row" style={{ gap: 6 }}>
            <Skel w={60} h={28} r={999} />
            <Skel w={80} h={28} r={999} />
          </div>
          <ChatListSkeleton rows={7} />
        </div>
        <div className="sk-panel sk-col sk-inbox-thread" style={{ gap: 12 }}>
          <div className="sk-row" style={{ gap: 10, alignItems: "center" }}>
            <Skel w={38} h={38} r={999} />
            <Skel w="30%" h={15} />
          </div>
          <ChatSkeleton />
          <Skel h={42} r={999} />
        </div>
      </div>
    </Busy>
  );
}
// the super admin coin orders page while it opens
export function CoinOrdersPageSkeleton() {
  return (
    <Busy className="sk-chat-page">
      <div className="sk-panel sk-col" style={{ gap: 8 }}>
        <Skel w="24%" h={20} />
        <Skel w="46%" h={11} />
      </div>
      <div className="sk-row" style={{ gap: 8 }}>
        {[90, 110, 80, 100].map((w, i) => (
          <Skel key={i} w={w} h={34} r={999} />
        ))}
      </div>
      <div className="sk-panel">
        <div className="sk-row" style={{ gap: 8, marginBottom: 14 }}>
          {[70, 80, 80, 70].map((w, i) => (
            <Skel key={i} w={w} h={30} r={999} />
          ))}
          <Skel h={34} r={999} style={{ flex: 1, minWidth: 140 }} />
        </div>
        <OrderCardsSkeleton rows={4} />
      </div>
    </Busy>
  );
}
