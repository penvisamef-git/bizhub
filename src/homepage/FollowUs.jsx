// "Follow us" (v3.2.0): BizHub's channels — a band above the footer and small icons in the footer.
// The links are in Super admin → Homepage settings (contact.*_url); a channel without a link isn't shown.
import { ArrowUpRight } from "lucide-react";
import { CHANNELS, CHANNEL_NAME, handleOf } from "./bizi-home";

// simple marks, white on the channel's colour
const MARK = {
  facebook: "M13.6 21.5v-7.6h2.6l.4-3.1h-3V8.9c0-.9.3-1.5 1.6-1.5h1.6V4.6a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.2H7.8v3.1h2.6v7.6z",
  tiktok: "M15.2 3h2.9a4.7 4.7 0 0 0 3.3 3.3v3a7.6 7.6 0 0 1-3.3-.9v6.2a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.1a2.6 2.6 0 1 0 1.8 2.4z",
  youtube: "M9.5 7.8v8.4l7.1-4.2z",
  telegram: "M20.7 4.4 3.3 11.1c-1.2.5-1.1 1.7 0 2l4.3 1.4 1.7 5.2c.2.7 1 .9 1.5.4l2.5-2.3 4.4 3.2c.7.5 1.5.2 1.7-.7l2.9-14.2c.3-1.2-.5-1.9-1.6-1.7zm-10.4 10.2 7.5-6.6-5.8 7.6-.3 2.9z",
  coolapp: "M12 3.2c-5.3 0-9.5 3.7-9.5 8.3 0 2.4 1.1 4.5 3 6.1l-.7 3 3.4-1.6c1.2.4 2.5.6 3.8.6 5.3 0 9.5-3.7 9.5-8.3S17.3 3.2 12 3.2zm3.9 10.9a4.7 4.7 0 1 1 0-5.2l-1.7 1.1a2.7 2.7 0 1 0 0 3z",
};
export function ChannelMark({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={MARK[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export const channelsOf = (contact) => CHANNELS.map((c) => ({ ...c, href: String(contact?.[c.url] || "").trim() })).filter((c) => /^https?:\/\//.test(c.href));

export default function FollowUs({ t, settings }) {
  const list = channelsOf(settings.contact);
  if (!list.length) return null;
  return (
    <section id="follow" className="hx-section hx-follow-wrap" data-testid="hx-follow">
      <div className="wrap">
        <div className="hx-head">
          <h2>{t.followTitle}</h2>
          <p>{t.followSub}</p>
        </div>
        <div className="hx-follow">
          {list.map((c) => (
            <a key={c.key} className={`hx-chan c-${c.key}`} href={c.href} target="_blank" rel="noopener noreferrer" style={{ "--chan": c.color }} data-testid={`hx-follow-${c.key}`}>
              <span className="hx-chan-ic">
                <ChannelMark name={c.key} size={26} />
              </span>
              <span className="hx-chan-txt">
                <b>{CHANNEL_NAME[c.key]}</b>
                <small>{handleOf(c.href)}</small>
              </span>
              <span className="hx-chan-act">
                {t[c.act]} <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// the footer's row of small icons
export function FootSocials({ t, settings }) {
  const list = channelsOf(settings.contact);
  if (!list.length) return null;
  return (
    <div className="hx-foot-follow" aria-label={t.followFoot}>
      <small>{t.followFoot}</small>
      {list.map((c) => (
        <a key={c.key} className={`c-${c.key}`} href={c.href} target="_blank" rel="noopener noreferrer" style={{ "--chan": c.color }} aria-label={CHANNEL_NAME[c.key]} title={`${CHANNEL_NAME[c.key]} · ${handleOf(c.href)}`} data-testid={`hx-foot-${c.key}`}>
          <ChannelMark name={c.key} size={18} />
        </a>
      ))}
    </div>
  );
}
