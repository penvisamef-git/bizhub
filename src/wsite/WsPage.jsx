import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Globe } from "lucide-react";
import { websitePublic } from "../api/services";
import SiteView from "./SiteView";
import { tx } from "./blocks";
import "./wsite.css";

const LANG_KEY = (slug) => `ws-lang:${slug}`;
function setMeta(name, content, prop = false) {
  const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(prop ? "property" : "name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content || "");
}

// The public website: /site/<slug>, /site/<slug>/<page>, /site/<slug>/blog, /site/<slug>/blog/<post>
export default function WsPage() {
  const { slug, page: pageSlug, post: postSlug } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY(slug)) || "";
    } catch {
      return "";
    }
  });
  const [blogList, setBlogList] = useState(null);
  const [post, setPost] = useState(null);
  const isBlog = /\/blog(\/|$)/.test(pathname.replace(`/site/${slug}`, "")) && !pageSlug;
  const view = postSlug ? { kind: "post", post: postSlug } : isBlog ? { kind: "blog" } : { kind: "page", slug: pageSlug || "" };

  useEffect(() => {
    setData(null);
    setError("");
    websitePublic
      .get(slug)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.status === 404 ? "off" : e.message || "error"));
  }, [slug]);

  const langs = data?.site?.langs?.length ? data.site.langs : ["km", "en"];
  const current = langs.includes(lang) ? lang : langs[0];
  const setLang = (l) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY(slug), l);
    } catch {
      /* private mode */
    }
  };

  const base = `/site/${data?.site?.slug || slug}`;
  const home = data?.pages?.find((p) => p.home) || data?.pages?.[0];
  const go = useCallback(
    (href) => (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      navigate(href);
      window.scrollTo({ top: 0 });
    },
    [navigate],
  );
  // a block's link → the attributes of an <a>
  const nav = useCallback(
    (to) => {
      const s = String(to || "");
      if (s.startsWith("page:")) {
        const p = s.slice(5);
        const href = !p || p === home?.slug ? base : `${base}/${p}`;
        return { href, onClick: go(href) };
      }
      if (s === "blog:") return { href: `${base}/blog`, onClick: go(`${base}/blog`) };
      if (s.startsWith("post:")) return { href: `${base}/blog/${s.slice(5)}`, onClick: go(`${base}/blog/${s.slice(5)}`) };
      if (s.startsWith("#"))
        return {
          href: s,
          onClick: (e) => {
            e.preventDefault();
            document.getElementById(s.slice(1))?.scrollIntoView({ behavior: "smooth" });
          },
        };
      if (/^https?:\/\//.test(s)) return { href: s, target: "_blank", rel: "noopener noreferrer" };
      return { href: s };
    },
    [base, home?.slug, go],
  );

  // the page being shown → title, share tags, one visit
  const shown = useMemo(() => (data && view.kind === "page" ? data.pages.find((p) => p.slug === view.slug) || home : null), [data, view.kind, view.slug, home]);
  useEffect(() => {
    if (!data) return;
    const s = data.site;
    const name = tx(s.name, current);
    const title =
      view.kind === "page"
        ? shown && !shown.home
          ? `${tx(shown.title, current)} · ${name}`
          : tx(s.seo?.title, current) || name
        : view.kind === "blog"
          ? `${current === "km" ? "ព័ត៌មាន" : "Blog"} · ${name}`
          : post
            ? `${tx(post.title, current)} · ${name}`
            : name;
    document.title = title;
    document.documentElement.lang = current;
    const desc = tx(s.seo?.description, current) || tx(s.tagline, current);
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    if (s.seo?.image || s.logo) setMeta("og:image", s.seo?.image || s.logo, true);
  }, [data, current, view.kind, shown, post]);
  const firstHit = useRef(true);
  useEffect(() => {
    if (!data) return;
    // the page that sent the visitor here (Facebook, Google, Telegram…) — only on the first page they open
    const ref = firstHit.current ? document.referrer : "";
    firstHit.current = false;
    websitePublic.hit(data.site.slug, view.kind === "page" ? shown?.slug || "home" : view.kind === "blog" ? "blog" : `blog-${view.post}`, ref);
  }, [data, view.kind, shown?.slug, view.post]);

  // blog
  const loadPosts = useCallback(
    (page = 1) =>
      websitePublic
        .posts(data.site.slug, page)
        .then((r) => setBlogList((old) => ({ rows: page === 1 ? r.data : [...(old?.rows || []), ...r.data], page, more: r.pagination.currentPage < r.pagination.totalPages })))
        .catch(() => setBlogList({ rows: [], page: 1, more: false })),
    [data],
  );
  useEffect(() => {
    if (data && view.kind === "blog" && data.blog) loadPosts(1);
  }, [data, view.kind, loadPosts]);
  useEffect(() => {
    if (!data || view.kind !== "post" || !data.blog) return;
    setPost(null);
    websitePublic
      .post(data.site.slug, view.post)
      .then((r) => setPost(r.data))
      .catch(() => navigate(`${base}/blog`, { replace: true }));
  }, [data, view.kind, view.post]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <div className="ws-off">
        <Globe size={40} />
        <h1>{error === "off" ? "This website isn't available" : "Something went wrong"}</h1>
        <p>{error === "off" ? "គេហទំព័រនេះមិនទាន់បើក ឬត្រូវបានផ្អាក។" : error}</p>
      </div>
    );
  if (!data) return <div className="ws-loading" aria-busy="true" />;
  return (
    <SiteView
      site={data.site}
      pages={data.pages}
      view={view}
      lang={current}
      setLang={setLang}
      blog={data.blog}
      posts={data.posts}
      blogList={blogList && { ...blogList, loadMore: () => loadPosts((blogList.page || 1) + 1) }}
      post={post}
      branding={data.branding}
      nav={nav}
      onSend={(body) => websitePublic.message(data.site.slug, body)}
      frame="live"
    />
  );
}
