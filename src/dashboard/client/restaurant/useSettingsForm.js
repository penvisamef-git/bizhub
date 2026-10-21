import { useEffect, useMemo, useRef, useState } from "react";
import { restaurantService } from "../../../api/services";

const pickKeys = (src, keys) => Object.fromEntries(keys.map((k) => [k, structuredClone(src?.[k] ?? "")]));

// Edit a part of the restaurant settings with a Save bar (dirty check, undo, leave warning)
export default function useSettingsForm(ctx, keys, { extra } = {}) {
  const saved = useMemo(() => pickKeys(ctx.settings, keys), [ctx.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState(saved);
  const [saving, setSaving] = useState(false);
  // settings changed elsewhere (logo upload, another tab): take the new values,
  // but keep what the person typed and hasn't saved yet
  const prev = useRef(saved);
  useEffect(() => {
    const before = prev.current;
    prev.current = saved;
    setForm((f) => Object.fromEntries(keys.map((k) => [k, JSON.stringify(f[k]) === JSON.stringify(before[k]) ? saved[k] : f[k]])));
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const save = async () => {
    setSaving(true);
    try {
      const res = await restaurantService.saveSettings(ctx.id, { ...form, ...(extra || {}) });
      ctx.setSettings(res.data, res.setup);
      ctx.notify({ type: "success", text: ctx.r.saved });
      return res;
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy(e.response.product);
      else ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setSaving(false);
    }
  };
  return { form, setForm, set, dirty, saving, save, undo: () => setForm(saved) };
}
