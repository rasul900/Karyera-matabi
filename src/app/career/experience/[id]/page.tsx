"use client";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, toast, fail } = useApp();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [role, setRole] = useState("");
  const [period, setPeriod] = useState("");
  const [more, setMore] = useState("");
  const load = useCallback(() => api(`/api/miniapp/career/entries/${id}`).then((r) => {
    setD(r); setRole(r.entry.role || ""); setPeriod(r.entry.period || "");
  }).catch(fail), [id, fail]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skeleton n={2} />;
  const e = d.entry;

  async function saveFields() {
    try {
      for (const [field, value] of [["role", role], ["period", period]] as const)
        if ((e[field] || "") !== value) await api(`/api/miniapp/career/entries/${id}/field`, { body: { field, value } });
      toast(t("saved")); await load();
    } catch (err) { fail(err); }
  }
  async function addMore() {
    try { await api(`/api/miniapp/career/entries/${id}/addendum`, { body: { text: more } }); setMore(""); toast(t("saved")); await load(); }
    catch (err) { fail(err); }
  }
  async function del() {
    if (!confirm(t("ka_del_q"))) return;
    try { await api(`/api/miniapp/career/entries/${id}/delete`, { method: "POST" }); router.push("/career/experience"); } catch (err) { fail(err); }
  }
  async function setSkill(sid: number, status: string) {
    try { await api(`/api/miniapp/skills/${sid}`, { body: { status } }); await load(); } catch (err) { fail(err); }
  }

  return (
    <Screen>
      <div className="h1">{e.title}</div>
      <div className="card stack"><b className="small soft">{t("ka_orig")}</b><p className="pre">{e.text}</p>
        {d.addenda.length > 0 && <><b className="small soft">{t("ka_added")}</b>{d.addenda.map((a: any) => <div key={a.id} className="quote">{a.text}</div>)}</>}
      </div>
      <div className="card stack">
        <div className="grid2">
          <label className="f">{t("ka_role")}<input className="in" value={role} onChange={(x) => setRole(x.target.value)} /></label>
          <label className="f">{t("ka_period")}<input className="in" value={period} onChange={(x) => setPeriod(x.target.value)} placeholder="2024–2025" /></label>
        </div>
        <button className="btn sm" type="button" onClick={saveFields}>{t("save")}</button>
      </div>
      {d.skills.map((s: any) => (
        <div className="card flat stack" key={s.id}>
          <div className="row between"><b>{s.names?.[lang] || s.name}</b>
            <span className={`tag ${s.status === "confirmed" ? "good" : "mid"}`}>{s.status === "confirmed" ? t("confirmed") : t("suggested")}</span></div>
          <div className="quote">«{s.evidence}»</div>
          {s.status !== "confirmed" && <div className="row">
            <button className="btn good sm" type="button" onClick={() => setSkill(s.id, "confirmed")}>{t("confirm")}</button>
            <button className="btn sm" type="button" onClick={() => setSkill(s.id, "removed")}>{t("remove")}</button></div>}
        </div>
      ))}
      <div className="card stack">
        <b>💬 {t("ka_details")}</b>
        <textarea className="in" placeholder={t("ka_details_ph")} value={more} onChange={(x) => setMore(x.target.value)} style={{ minHeight: 90 }} />
        <button className="btn primary sm" type="button" disabled={more.trim().length < 3} onClick={addMore}>{t("save")}</button>
      </div>
      <button className="btn bad block" type="button" onClick={del}>{t("ka_delete")}</button>
    </Screen>
  );
}
