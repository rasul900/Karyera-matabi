"use client";
// Vacancies the user found elsewhere: pasted text or a public link; the AI pulls the requirements and matches them.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Empty, Ring, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function MyVacancies() {
  const { t, fail } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api("/api/miniapp/career/vacancies").then((d) => setItems(d.items)).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { const r = await api("/api/miniapp/career/vacancies", { body: { text, url } }); router.push(`/career/vacancies/${r.id}`); }
    catch (err) { fail(err); setBusy(false); }
  }

  if (!items) return <Skeleton n={3} />;
  return (
    <Screen>
      <div className="row between"><div className="h1">🎯 {t("ka_vac")}</div>
        <button className="btn primary sm" type="button" onClick={() => setOpen(!open)}>{t("ka_add_vac")}</button></div>
      <p className="small soft">{t("ka_vac_sub")}</p>
      {open && (
        <form className="card stack" onSubmit={add}>
          <textarea className="in" maxLength={20000} placeholder={t("ka_vac_ph")} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 160 }} />
          <input className="in" type="url" placeholder={t("ka_vac_url")} value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className={`btn primary block${busy ? " busy" : ""}`} type="submit" disabled={busy || (text.trim().length < 40 && !url.trim())}>{t("ka_analyze")}</button>
        </form>
      )}
      {items.length ? items.map((v) => (
        <Link key={v.id} className="card tap list-item" href={`/career/vacancies/${v.id}`}>
          <Ring p={v.match_percent || 0} label={t("match")} />
          <div className="grow"><div className="h2">{v.title}</div>
            <div className="small soft">{v.company || "—"}</div>
            <span className="tag" style={{ marginTop: 6 }}>{t("ka_st")[v.status] || v.status}</span></div>
        </Link>
      )) : <Empty icon="🎯">{t("ka_no_vac")}</Empty>}
    </Screen>
  );
}
