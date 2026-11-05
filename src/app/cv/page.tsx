"use client";
// CV intake: a file or pasted text plus the graduate's field. The AI extracts competencies (each with the exact
// sentence it comes from), contacts, and returns matching vacancies at once.
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app";
import { DoneCheck, Empty, NeedProfile, Screen, Skeleton, VacCard } from "@/components/ui";
import { api } from "@/lib/api";
import { openBot } from "@/lib/telegram";

export default function CvPage() {
  const app = useApp();
  const { me, t, isGrad, profileOk, profName, toast, fail, setMe, lang } = app;
  const p = me.profile || {};
  const [mode, setMode] = useState<"file" | "text">("file");
  const [role, setRole] = useState<string>(p.desired_role || "");
  const [prof, setProf] = useState<string>(p.profession || "");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [useAi, setUseAi] = useState<boolean>(!!me.ai_consent);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const out = useRef<HTMLDivElement>(null);

  useEffect(() => { if (busy) out.current?.scrollIntoView({ behavior: "smooth" }); }, [busy]);

  if (!isGrad) return <Empty icon="📄">—</Empty>;
  if (!profileOk) return <NeedProfile t={t} link={me.profile_link} onOpen={openBot} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim() && !prof) return toast(t("required"), true);
    if (mode === "file" && !file) return toast(t("cv_drop"), true);
    if (mode === "text" && text.trim().length < 40) return toast(t("cv_paste"), true);
    const fd = new FormData();
    fd.set("desired_role", role);
    fd.set("profession", prof);
    if (useAi) fd.set("use_ai", "1");
    if (mode === "file" && file) fd.set("file", file); else fd.set("text", text);
    setBusy(true);
    setResult(null);
    try {
      const r = await api("/api/miniapp/cv", { form: fd });
      setResult(r);
      setMe((m: any) => ({ ...m, has_cv: true, profile: { ...m.profile, profession: r.field.profession, desired_role: r.field.desired_role } }));
      toast(t("cv_done"));
    } catch (err) { fail(err); }
    setBusy(false);
  }

  async function refresh() {
    if (!result) return;
    const [cv, vac] = await Promise.all([api("/api/miniapp/cv"), api("/api/miniapp/vacancies")]);
    const ids = new Set(result.skills.map((s: any) => s.id));
    setResult({ ...result, skills: cv.skills.filter((s: any) => ids.has(s.id)), matches: vac.items.slice(0, 20) });
  }

  async function setSkill(id: number, status: string) {
    try { await api(`/api/miniapp/skills/${id}`, { body: { status } }); await refresh(); } catch (e) { fail(e); }
  }
  async function confirmAll() {
    try { const r = await api("/api/miniapp/skills-confirm-all", { method: "POST" }); toast(`✓ ${r.confirmed}`); await refresh(); } catch (e) { fail(e); }
  }

  const profs = Object.keys(me.dicts.professions);
  const c = result?.contacts || {};
  const contacts = [["email", c.email], ["phone", c.phone], ["linkedin", c.linkedin], ["education", c.education]].filter(([, v]) => v);
  const pending = result ? result.skills.filter((s: any) => s.status === "suggested").length : 0;

  return (
    <>
      <form className="stack enter" onSubmit={submit}>
        <div className="h1">{t("cv_title")}</div>
        <label className="f">{t("cv_field")} *
          <input className="in" maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("cv_field_hint")} />
        </label>
        <div className="f" style={{ fontSize: 13, fontWeight: 600, color: "var(--soft)" }}>{t("cv_pick")}</div>
        <div className="chips">
          {profs.map((k) => (
            <button key={k} type="button" className={`chip${prof === k ? " on" : ""}`} onClick={() => setProf(prof === k ? "" : k)}>{profName(k)}</button>
          ))}
        </div>
        <div className="seg" role="tablist">
          <button type="button" className={mode === "file" ? "on" : ""} onClick={() => setMode("file")}>📎 {t("cv_file")}</button>
          <button type="button" className={mode === "text" ? "on" : ""} onClick={() => setMode("text")}>✍️ {t("cv_text")}</button>
        </div>
        {mode === "file" ? (
          <label className={`drop${file ? " has" : ""}`}>
            <input type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="ico" aria-hidden="true">📄</div>
            <div className="small soft">{file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB` : t("cv_drop")}</div>
          </label>
        ) : (
          <textarea className="in" maxLength={60000} placeholder={t("cv_paste")} style={{ minHeight: 200 }} value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {me.ai_available && (
          <label className="check"><input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /><span>{t("cv_ai")}</span></label>
        )}
        <button className={`btn primary block${busy ? " busy" : ""}`} type="submit" disabled={busy}>{t("cv_send")}</button>
      </form>

      <div ref={out} className="stack" style={{ marginTop: 14 }}>
        {busy && <div className="card stack" style={{ textAlign: "center" }}><p className="soft">✨ {t("cv_working")}</p><Skeleton n={2} /></div>}
        {result && (
          <Screen>
            <div className="card stack">
              <div className="row between">
                <div className="row" style={{ gap: 10 }}><DoneCheck small /><div className="h2">{t("cv_done")}</div></div>
                <span className="tag info">{t("analyzer", { a: result.analyzer === "rules" ? t("rules") : result.analyzer })}</span>
              </div>
              <div className="soft small">{t("cv_found", { n: result.skills.length })}{result.field.profession ? " · " + profName(result.field.profession) : ""}</div>
              {contacts.length > 0 && (
                <dl className="kv">{contacts.map(([k, v]) => <Fragmentless key={k as string} k={t(k as string)} v={v as string} />)}</dl>
              )}
            </div>
            {result.skills.length > 0 && (
              <div className="row between">
                <div className="sec-title">{t("cv_skills")}</div>
                {pending > 0 && <button className="btn good sm" type="button" onClick={confirmAll}>{t("confirm_all")}</button>}
              </div>
            )}
            {result.skills.length > 0 && <p className="small soft">{t("cv_skills_hint")}</p>}
            {result.skills.map((s: any) => (
              <div className="card flat stack" key={s.id}>
                <div className="row between">
                  <b>{s.names?.[lang] || s.name}</b>
                  <span className={`tag ${s.status === "confirmed" ? "good" : "mid"}`}>{s.status === "confirmed" ? t("confirmed") : t("suggested")}</span>
                </div>
                <div className="quote">«{s.evidence}»</div>
                {s.status !== "confirmed" && (
                  <div className="row">
                    <button className="btn good sm" type="button" onClick={() => setSkill(s.id, "confirmed")}>{t("confirm")}</button>
                    <button className="btn sm" type="button" onClick={() => setSkill(s.id, "removed")}>{t("remove")}</button>
                  </div>
                )}
              </div>
            ))}
            <div className="sec-title">{t("matches")}</div>
            {result.matches.length ? result.matches.map((v: any) => <VacCard key={v.id} v={v} t={t} skillName={app.skillName} />)
              : <Empty icon="🔎">{t("no_matches")}</Empty>}
          </Screen>
        )}
      </div>
    </>
  );
}

function Fragmentless({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}
