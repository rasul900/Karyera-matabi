"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Ring, salary, Screen, Sheet, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, profName, fmtName, empName, skillName, toast, fail } = useApp();
  const [d, setD] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/api/miniapp/vacancies/${id}`).then(setD).catch(fail), [id, fail]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skeleton n={3} />;
  const v = d.vacancy, m = d.match;

  const list = (title: string, items: any[], cls: string, sign: string) => items.length > 0 && (
    <div className="stack" style={{ gap: 6 }}>
      <b className="small">{title}</b>
      <div className="row">{items.map((x) => <span key={x.name} className={`tag ${cls}`}>{sign} {skillName(x.name)}</span>)}</div>
    </div>
  );
  const bullets = (s: string) => <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{String(s).split("\n").filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul>;

  async function preview() {
    try { setResume((await api(`/api/miniapp/vacancies/${id}/resume`)).resume); setSheet(true); } catch (e) { fail(e); }
  }
  async function apply() {
    setBusy(true);
    try { await api(`/api/miniapp/vacancies/${id}/apply`, { method: "POST" }); setSheet(false); toast(t("app_sent")); await load(); }
    catch (e) { fail(e); }
    setBusy(false);
  }
  async function favorite() {
    try { const r = await api(`/api/miniapp/vacancies/${id}/favorite`, { method: "POST" }); toast(r.favorite ? t("fav_on") : t("fav_off")); await load(); }
    catch (e) { fail(e); }
  }

  return (
    <>
      <Screen>
        <div className="card stack">
          <div className="h1">{v.title}</div>
          <div className="soft">{v.company_name} · {v.city}</div>
          <div className="row"><span className="tag">{fmtName(v.work_format)}</span><span className="tag">{empName(v.employment)}</span>
            <span className="tag brand">{profName(v.profession)}</span></div>
          <div className="h2">{salary(t, v)}</div>
          {v.deadline && <div className="small soft">{t("deadline", { d: v.deadline })}</div>}
        </div>
        <div className="card stack">
          <div className="row">
            <Ring p={m.percent || 0} label={t("match")} />
            <div className="grow"><b>{m.percent || 0}% {t("match")}</b><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${m.percent || 0}%` }} /></div></div>
          </div>
          {list(t("matched"), m.matched, "good", "✓")}{list(t("partial"), m.partial, "mid", "~")}{list(t("missing"), m.missing, "bad", "✕")}
        </div>
        <div className="card"><b>{t("tasks")}</b>{bullets(v.tasks)}</div>
        <div className="card"><b>{t("reqs")}</b>{bullets(v.requirements)}</div>
        <div className="card"><b>{t("training")}</b><p className="pre" style={{ marginTop: 6 }}>{v.training}</p>
          {v.probation_months > 0 && <p className="small soft" style={{ marginTop: 6 }}>{t("probation", { n: v.probation_months })}</p>}</div>
        {d.applied ? <div className="card row between"><b>{t("applied", { s: t("app_st")[d.applied] || d.applied })}</b></div>
          : d.verified ? <button className="btn primary block" type="button" onClick={preview}>{t("apply")}</button>
          : <div className="warn">{t("need_verify")}</div>}
        <button className="btn ghost block" type="button" onClick={favorite}>{d.favorite ? "★" : "☆"} {t("favs").replace("★ ", "")}</button>
      </Screen>
      <Sheet open={sheet} onClose={() => setSheet(false)} closeLabel={t("close")}>
        {resume && (
          <>
            <div className="h2">{t("preview")}</div>
            <div className="info">🤖 {t("ai_note")}</div>
            <div className="card flat stack">
              <div className="h2">{resume.name}</div>
              {resume.education.university && <div className="small">{resume.education.university} · {resume.education.specialty} · {resume.education.grad_year}</div>}
              {resume.experience.map((x: any, i: number) => <div key={i} className="quote">{x.text}<br /><span className="tiny">{x.skills.join(", ")}</span></div>)}
              <div className="row">{resume.skills.map((s: any) => <span key={s.name} className={`tag ${s.matched ? "good" : ""}`}>{skillName(s.name)}</span>)}</div>
            </div>
            {resume.warnings.map((w: string) => <div key={w} className="warn">{w}</div>)}
            <button className={`btn primary block${busy ? " busy" : ""}`} type="button" onClick={apply} disabled={busy || !resume.experience.length}>{t("send_app")}</button>
          </>
        )}
      </Sheet>
    </>
  );
}
