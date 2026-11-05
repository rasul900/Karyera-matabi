"use client";
// One external vacancy: explained match (method, confirmed / partial / missing, what to add, keywords),
// status for the tracker, and a CV in uz / ru / en built only from confirmed facts.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Ring, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, sqlIso } from "@/lib/format";

const STATUSES = ["found", "analyzing", "cv_generated", "ready", "applied", "interview", "rejected", "offer"];

export default function ExternalVacancy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, skillName, toast, fail } = useApp();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [cvLang, setCvLang] = useState<string>(lang);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/api/miniapp/career/vacancies/${id}`).then(setD).catch(fail), [id, fail]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skeleton n={3} />;
  const v = d.vacancy, m = d.match;

  const tags = (title: string, items: any[], cls: string, sign: string) => items.length > 0 && (
    <div className="stack" style={{ gap: 6 }}><b className="small">{title}</b>
      <div className="row">{items.map((x: any) => <span key={x.name} className={`tag ${cls}`} title={x.evidence || ""}>{sign} {skillName(x.name)}</span>)}</div></div>
  );
  const rec = (r: any) => r.code === "confirm" ? t("ka_rec_confirm", { n: skillName(r.name) })
    : r.code === "related" ? t("ka_rec_related", { n: skillName(r.name), v: skillName(r.via) }) : t("ka_rec_add", { n: skillName(r.name) });

  async function setStatus(status: string) {
    try { await api(`/api/miniapp/career/vacancies/${id}/status`, { body: { status } }); toast(t("saved")); await load(); } catch (e) { fail(e); }
  }
  async function makeCv() {
    setBusy(true);
    try { const r = await api("/api/miniapp/career/cv", { body: { kind: "external", target_id: +id, lang: cvLang } }); router.push(`/career/cv/${r.id}`); }
    catch (e: any) { if (e?.code === "no_facts") toast(t("ka_need_confirm"), true); else fail(e); setBusy(false); }
  }
  async function del() {
    if (!confirm(t("ka_del_q"))) return;
    try { await api(`/api/miniapp/career/vacancies/${id}/delete`, { method: "POST" }); router.push("/career/vacancies"); } catch (e) { fail(e); }
  }

  return (
    <Screen>
      <div className="card stack">
        <div className="h1">{v.title}</div>
        <div className="soft">{v.company || "—"}{v.level ? " · " + t("ka_level", { l: v.level }) : ""}</div>
        {v.url && <a className="small" style={{ color: "var(--brand)" }} href={v.url} target="_blank" rel="noopener noreferrer">{v.url.slice(0, 60)} ↗</a>}
      </div>
      <div className="card stack">
        <div className="row"><Ring p={m.percent || 0} label={t("match")} />
          <div className="grow"><b>{m.percent || 0}% {t("match")}</b><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${m.percent || 0}%` }} /></div></div></div>
        {tags(t("matched"), m.matched, "good", "✓")}{tags(t("partial"), m.partial, "mid", "~")}{tags(t("missing"), m.missing, "bad", "✕")}
        {m.emphasis?.length > 0 && <div className="small"><b>{t("ka_emphasis")}:</b> {m.emphasis.map(skillName).join(", ")}</div>}
        <details><summary className="small" style={{ cursor: "pointer", color: "var(--brand)" }}>ℹ️ {t("ka_method").split(" (")[0]}</summary>
          <p className="small soft" style={{ marginTop: 6 }}>{t("ka_method")}</p></details>
      </div>
      {m.recommendations?.length > 0 && (
        <div className="card stack"><b>💡 {t("ka_recs")}</b>
          {m.recommendations.map((r: any, i: number) => <div key={i} className="small">• {rec(r)}</div>)}
          <Link className="btn sm" href="/career/experience">{t("ka_add_exp")}</Link></div>
      )}
      <div className="card stack">
        <b>{t("ka_status")}</b>
        <div className="chips">{STATUSES.map((s) => (
          <button key={s} type="button" className={`chip${v.status === s ? " on" : ""}`} onClick={() => setStatus(s)}>{t("ka_st")[s]}</button>))}</div>
      </div>
      <div className="card stack">
        <b>{t("ka_cv_lang")}</b>
        <div className="seg">{["uz", "ru", "en"].map((l) => (
          <button key={l} type="button" className={cvLang === l ? "on" : ""} onClick={() => setCvLang(l)}>{l.toUpperCase()}</button>))}</div>
        <button className={`btn primary block${busy ? " busy" : ""}`} type="button" disabled={busy} onClick={makeCv}>{t("ka_make_cv")}</button>
        {d.versions.length > 0 && <>
          <b className="small soft">{t("ka_versions")}</b>
          {d.versions.map((x: any) => (
            <Link key={x.id} className="row between small" href={`/career/cv/${x.id}`}>
              <span>№{x.id} · {x.lang.toUpperCase()} · {fmtDate(lang, sqlIso(x.created_at))}</span><span>{x.has_letter ? "✉️" : ""} →</span>
            </Link>))}
        </>}
      </div>
      <details className="card"><summary className="small" style={{ cursor: "pointer" }}>{t("ka_reqs")} · {v.requirements.length}</summary>
        <p className="pre small soft" style={{ marginTop: 8 }}>{d.text}</p></details>
      <button className="btn bad block" type="button" onClick={del}>{t("ka_delete")}</button>
    </Screen>
  );
}
