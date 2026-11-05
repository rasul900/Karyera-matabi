"use client";
// A CV version (only confirmed facts) with its cover letter; PDF / Word through a 5-minute signed link.
import { use, useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { tg } from "@/lib/telegram";

export default function CvVersion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, toast, fail } = useApp();
  const [d, setD] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [letter, setLetter] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/api/miniapp/career/cv/${id}`).then((r) => { setD(r); setLetter(r.cover_letter || ""); }).catch(fail), [id, fail]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skeleton n={3} />;
  const c = d.content, h = c.headings || {};

  async function makeLetter() {
    setBusy(true);
    try { const r = await api(`/api/miniapp/career/cv/${id}/letter`, { method: "POST" }); setLetter(r.cover_letter); await load(); } catch (e) { fail(e); }
    setBusy(false);
  }
  async function saveLetter() {
    try { await api(`/api/miniapp/career/cv/${id}/letter`, { body: { text: letter } }); setEdit(false); toast(t("saved")); await load(); } catch (e) { fail(e); }
  }
  async function file(fmt: string, withLetter: boolean) {
    try {
      const { url } = await api(`/api/miniapp/career/cv/${id}/link`, { body: { fmt, letter: withLetter } });
      const w = tg();
      if (w?.openLink) w.openLink(url); else window.open(url, "_blank");
    } catch (e: any) { if (e?.code === "demo") toast(t("ka_files_demo"), true); else fail(e); }
  }

  return (
    <Screen>
      <div className="info">{t("ka_cv_note")}</div>
      <div className="card stack" style={{ gap: 10 }}>
        <div><div className="h1">{c.name}</div><div className="soft small">{c.target?.title}{c.target?.company ? " · " + c.target.company : ""}</div></div>
        {c.summary && <p className="small">{c.summary}</p>}
        {(c.skills?.hard?.length > 0 || c.skills?.soft?.length > 0) && <div className="stack" style={{ gap: 6 }}>
          <b className="small">{h.skills || "Skills"}</b>
          <div className="row">{c.skills.hard.map((s: string) => <span key={s} className="tag good">{s}</span>)}
            {c.skills.soft.map((s: string) => <span key={s} className="tag info">{s}</span>)}</div></div>}
        {c.experience?.length > 0 && <div className="stack" style={{ gap: 8 }}>
          <b className="small">{h.experience || "Experience"}</b>
          {c.experience.map((e: any) => (
            <div key={e.entry_id} className="stack" style={{ gap: 4 }}>
              <b>{e.title}</b>{(e.role || e.period) && <span className="tiny soft">{[e.role, e.period].filter(Boolean).join(" · ")}</span>}
              {e.facts.map((f: any, i: number) => <div key={i} className="quote">{f.text}</div>)}
            </div>))}
        </div>}
        {c.achievements?.length > 0 && <div className="stack" style={{ gap: 4 }}><b className="small">{h.achievements || "Achievements"}</b>
          {c.achievements.map((a: string, i: number) => <div key={i} className="small">• {a}</div>)}</div>}
        {c.education?.university && <div className="small"><b>{h.education || "Education"}:</b> {[c.education.university, c.education.specialty, c.education.grad_year].filter(Boolean).join(", ")}</div>}
        {c.keywords?.length > 0 && <div className="tiny soft">ATS: {c.keywords.join(" · ")}</div>}
      </div>
      <div className="grid2">
        <button className="btn" type="button" onClick={() => file("pdf", false)}>{t("ka_pdf")}</button>
        <button className="btn" type="button" onClick={() => file("docx", false)}>{t("ka_docx")}</button>
      </div>
      <div className="card stack">
        <div className="row between"><b>✉️ {t("ka_letter")}</b>
          {letter && !edit && <button className="btn sm" type="button" onClick={() => setEdit(true)}>{t("ka_edit_letter")}</button>}</div>
        {!letter && <button className={`btn primary block${busy ? " busy" : ""}`} type="button" disabled={busy} onClick={makeLetter}>{t("ka_make_letter")}</button>}
        {letter && !edit && <p className="pre small">{letter}</p>}
        {edit && <><textarea className="in" style={{ minHeight: 220 }} value={letter} onChange={(e) => setLetter(e.target.value)} />
          <button className="btn primary sm" type="button" onClick={saveLetter}>{t("save")}</button></>}
        {letter && !edit && <div className="grid2">
          <button className="btn sm" type="button" onClick={() => file("pdf", true)}>{t("ka_pdf")} · {t("ka_with_letter")}</button>
          <button className="btn sm" type="button" onClick={() => file("docx", true)}>{t("ka_docx")} · {t("ka_with_letter")}</button></div>}
      </div>
    </Screen>
  );
}
