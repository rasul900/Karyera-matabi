"use client";
// The experience base: any activity, not only jobs. The raw words are kept as written; the AI suggests
// competencies with the sentence they come from.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Empty, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, sqlIso } from "@/lib/format";

const ICON: Record<string, string> = { text: "📝", voice: "🎙", document: "📎", link: "🔗" };

export default function Experience() {
  const { t, lang, toast, fail } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api("/api/miniapp/career/entries").then((d) => setItems(d.items)).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api("/api/miniapp/career/entries", { body: { text, title } });
      toast(t("ka_skills_found", { n: r.skills.length }));
      setText(""); setTitle(""); setOpen(false);
      await load();
    } catch (err) { fail(err); }
    setBusy(false);
  }

  if (!items) return <Skeleton n={3} />;
  return (
    <Screen>
      <div className="row between"><div className="h1">📚 {t("ka_exp")}</div>
        <button className="btn primary sm" type="button" onClick={() => setOpen(!open)}>{t("ka_add_exp")}</button></div>
      {open && (
        <form className="card stack" onSubmit={add}>
          <label className="f">{t("ka_exp_title")}<input className="in" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <textarea className="in" maxLength={5000} placeholder={t("ka_exp_ph")} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 140 }} />
          <button className={`btn primary block${busy ? " busy" : ""}`} type="submit" disabled={busy || text.trim().length < 10}>{t("ka_save_analyze")}</button>
        </form>
      )}
      {items.length ? items.map((e) => (
        <Link key={e.id} className="card tap stack" href={`/career/experience/${e.id}`}>
          <div className="row between"><b>{ICON[e.source] || "📝"} {e.title}</b><span className="tag good">{e.n_skills}</span></div>
          <div className="small soft">{[e.role, e.period].filter(Boolean).join(" · ") || fmtDate(lang, sqlIso(e.created_at), { day: "numeric", month: "short" })}</div>
        </Link>
      )) : <Empty icon="📚">{t("ka_no_exp")}</Empty>}
    </Screen>
  );
}
