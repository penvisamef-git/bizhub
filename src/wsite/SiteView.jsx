import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { tx } from "./blocks";
import { Block, Paras, Pic, PostCard, socialLinks } from "./SiteBlocks";
import { loadWsFont, wsLook } from "./themes";
import "./wsite.css";
import PoweredBy from "../components/PoweredBy";

// A whole website: header + the page's blocks (or the blog) + footer. Used by the public pages (/site/…)
// and by the editor's live preview (preview = true: links switch pages inside the editor, the form doesn't send).
export default function SiteView({ site, pages, view = { kind: "page" }, lang, setLang, blog, posts = [], blogList, post, branding = true, nav, onSend, preview = false, picked, onPick, frame = "" }) {
  const look = useMemo(() => wsLook(site), [site]);
  useEffect(() => loadWsFont(look.font), [look.font]);
  const [menuOpen, setMenuOpen] = useState(false);
  const home = pages.find((p) => p.home) || pages[0];
  const page = view.kind === "page" ? pages.find((p) => p.slug === view.slug) || home : null;
  const langs = site.langs?.length ? site.langs : ["km", "en"];
  const name = tx(site.name, lang) || "";
  const menu = pages.filter((p) => p.menu);
  useEffect(() => setMenuOpen(false), [view.kind, view.slug, view.post]);
  const links = socialLinks(site.contact);
  const k = lang === "km";
  const blocks = (page?.blocks || []).filter((b) => !b.hidden);

  return (
    <div className={`ws ${frame}`} style={look.vars} {...look.attrs} lang={lang} data-testid="ws-site">
      <header className="ws-top">
        <div className="ws-in ws-top-in">
          <a className="ws-brand" {...nav(`page:${home?.slug || "home"}`)} data-testid="ws-brand">
            {site.logo ? <img src={site.logo} alt="" /> : <span className="ws-brand-mark">{(name || "W").slice(0, 1)}</span>}
            <span className="ws-brand-name">{name}</span>
          </a>
          <nav className={`ws-nav ${menuOpen ? "open" : ""}`} aria-label={k ? "ម៉ឺនុយ" : "Menu"}>
            {menu.map((p) => (
              <a key={p.slug} {...nav(`page:${p.slug}`)} className={page?.slug === p.slug ? "on" : ""}>
                {tx(p.title, lang)}
              </a>
            ))}
            {blog && (
              <a {...nav("blog:")} className={view.kind !== "page" ? "on" : ""}>
                {k ? "ព័ត៌មាន" : "Blog"}
              </a>
            )}
          </nav>
          <div className="ws-top-acts">
            {langs.length > 1 && (
              <div className="ws-lang" role="group" aria-label="Language">
                {langs.map((l) => (
                  <button key={l} type="button" className={l === lang ? "on" : ""} onClick={() => setLang(l)} data-testid={`ws-lang-${l}`}>
                    {l === "km" ? "ខ្មែរ" : "EN"}
                  </button>
                ))}
              </div>
            )}
            {(menu.length > 0 || blog) && (
              <button type="button" className="ws-burger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label={k ? "ម៉ឺនុយ" : "Menu"}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="ws-main">
        {view.kind === "page" &&
          blocks.map((b, i) => (
            <section
              key={b.id}
              id={b.id}
              className={`ws-b ws-b-${b.type} ${i % 2 ? "odd" : "even"} ${preview && onPick ? "pickable" : ""} ${picked === b.id ? "picked" : ""}`}
              onClickCapture={
                preview && onPick
                  ? (e) => {
                      if (e.target.closest("a,button,input,textarea,summary,iframe")) return;
                      onPick(b.id);
                    }
                  : undefined
              }
            >
              <Block b={b} lang={lang} nav={nav} site={site} posts={posts} blog={blog} onSend={onSend} preview={preview} page={page?.slug} />
            </section>
          ))}
        {view.kind === "page" && !blocks.length && (
          <section className="ws-b">
            <div className="ws-in ws-empty">{k ? "ទំព័រនេះមិនទាន់មានប្លុកទេ។" : "This page has no blocks yet."}</div>
          </section>
        )}
        {view.kind === "blog" && (
          <section className="ws-b">
            <div className="ws-in">
              <header className="ws-head c">
                <h1>{k ? "ព័ត៌មាន" : "Blog"}</h1>
              </header>
              {blogList?.rows?.length ? (
                <div className="ws-posts">
                  {blogList.rows.map((p) => (
                    <PostCard key={p._id} p={p} lang={lang} nav={nav} />
                  ))}
                </div>
              ) : (
                <p className="ws-mute ws-note">{blogList ? (k ? "មិនទាន់មានអត្ថបទ។" : "No posts yet.") : "…"}</p>
              )}
              {blogList?.more && (
                <div className="ws-btns c">
                  <button type="button" className="ws-btn ghost" onClick={blogList.loadMore}>
                    {k ? "មើលបន្ថែម" : "More posts"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        {view.kind === "post" && (
          <section className="ws-b">
            <article className="ws-in ws-narrow ws-article">
              <a className="ws-back" {...nav("blog:")}>
                <ArrowLeft size={16} /> {k ? "ព័ត៌មានទាំងអស់" : "All posts"}
              </a>
              {post ? (
                <>
                  <small className="ws-mute">
                    {new Date(post.date).toLocaleDateString(k ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    {post.category ? ` · ${post.category}` : ""}
                  </small>
                  <h1>{tx(post.title, lang)}</h1>
                  {post.cover && <Pic src={post.cover} ratio="16 / 9" className="ws-card-pic" />}
                  <Paras text={tx(post.body, lang) || tx(post.excerpt, lang)} />
                </>
              ) : (
                <p className="ws-mute">…</p>
              )}
            </article>
          </section>
        )}
      </main>

      <footer className="ws-foot">
        <div className="ws-in ws-foot-in">
          <div className="ws-foot-brand">
            <b>{name}</b>
            {tx(site.tagline, lang) && <span>{tx(site.tagline, lang)}</span>}
            {tx(site.contact?.address, lang) && <span>{tx(site.contact.address, lang)}</span>}
          </div>
          {links.length > 0 && (
            <div className="ws-social">
              {links.map(({ key, icon: Icon, label, href }) => (
                <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label={label}>
                  <Icon size={17} /> <span>{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="ws-in ws-foot-bottom">
          <span>
            © {new Date().getFullYear()} {name}
            {tx(site.footer, lang) ? ` · ${tx(site.footer, lang)}` : ""}
          </span>
          {branding && (
            <span className="ws-made-wrap">
              <a href="/" target="_blank" rel="noopener" className="ws-made" data-testid="ws-made">
                {k ? "បង្កើតដោយ BizHub" : "Made with BizHub"}
              </a>
              <PoweredBy as="span" lang={k ? "km" : "en"} className="ws-powered" />
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
