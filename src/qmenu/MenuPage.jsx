import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { publicGet, publicPost } from "../api/client";
import MenuView from "./MenuView";

const OFF = {
  km: { title: "ម៉ឺនុយមិនទាន់បើក", sub: "ម៉ឺនុយនេះមិនទាន់មាន ឬត្រូវបានផ្អាកបណ្តោះអាសន្ន។", retry: "ព្យាយាមម្តងទៀត" },
  en: { title: "Menu not available", sub: "This menu doesn't exist yet or is paused for now.", retry: "Try again" },
};

// /q/:slug — the menu guests see after scanning the QR code (view only)
export default function MenuPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const seen = useRef(new Set()); // items opened this visit (counted once)
  const load = () =>
    publicGet(`/q/${encodeURIComponent(slug)}`)
      .then((r) => {
        setData(r.data);
        setError(null);
        document.title = r.data.name;
        // count one scan per visit (not on every refresh)
        const k = `qm-seen-${slug}`;
        try {
          if (!sessionStorage.getItem(k)) {
            sessionStorage.setItem(k, "1");
            publicPost(`/q/${encodeURIComponent(slug)}/hit`, {}).catch(() => {});
          }
        } catch {
          publicPost(`/q/${encodeURIComponent(slug)}/hit`, {}).catch(() => {});
        }
      })
      .catch((e) => setError(e));
  useEffect(() => {
    load();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) {
    const lang = (navigator.language || "").startsWith("km") ? "km" : "en";
    const t = OFF[lang];
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "'Kantumruy Pro', system-ui, sans-serif", textAlign: "center", background: "#f6f6f8" }}>
        <div>
          <div style={{ fontSize: 48 }}>🍽️</div>
          <h1 style={{ fontSize: 22, margin: "8px 0" }}>{t.title}</h1>
          <p style={{ color: "#6b7080" }}>{t.sub}</p>
          {error.code === "NETWORK" && (
            <button type="button" onClick={load} style={{ marginTop: 10, padding: "10px 18px", borderRadius: 999, border: 0, background: "#E0581A", color: "#fff", fontWeight: 700 }}>
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!data)
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f6f8" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid #ddd", borderTopColor: "#E0581A", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  return (
    <MenuView
      data={data}
      onHit={(id) => {
        if (seen.current.has(id)) return;
        seen.current.add(id);
        publicPost(`/q/${encodeURIComponent(slug)}/hit`, { item_id: id }).catch(() => {});
      }}
      onFeedback={(body) => publicPost(`/q/${encodeURIComponent(slug)}/feedback`, body)}
    />
  );
}
