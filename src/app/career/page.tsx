"use client";
// Personal AI Career Agent: the experience base, the competency map with evidence, the user's own vacancies
// (analysed and matched), CVs and letters per vacancy, and the application tracker — one screen to start from.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { NeedProfile, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { openBot } from "@/lib/telegram";

export default function Career() {
  const { me, t, lang, isGrad, profileOk, fail } = useApp();
  const [d, setD] = useState<any>(null);
  useEffect(() => { if (isGrad && profileOk) api("/api/miniapp/career").then(setD).catch(fail); }, [isGrad, profileOk, fail]);
  if (!isGrad) return <div className="empty">—</div>;
  if (!profileOk) return <NeedProfile t={t} link={me.profile_link} onOpen={openBot} />;
  if (!d) return <Skeleton n={4} />;
  const tr = d.tracker, cats = t("ka_cat");
  const byCat: Record<string, any[]> = {};
  for (const s of d.confirmed) (byCat[s.category] ||= []).push(s);
  const name = (s: any) => s.names?.[lang] || s.name;
  return (
    <Screen>
      <div className="hero stack">
        <div className="h1">{t("ka_title")}</div>
        <p>{t("ka_sub")}</p>
        <Link className="btn white" href="/cv">📄 {t("ka_cv")}</Link>
      </div>
      <div className="grid2">
        <Link className="stat" href="/career/experience"><span className="small soft">📚 {t("ka_exp")}</span><b>{d.counts.entries}</b>
          <span className="tiny soft">{t("ka_entries")}</span></Link>
        <Link className="stat" href="/career/vacancies"><span className="small soft">🎯 {t("ka_vac")}</span><b>{tr.external}</b>
          <span className="tiny soft">{t("ka_found")}</span></Link>
      </div>
      <div className="card stack">
        <div className="row between"><b>📊 {t("ka_tracker")}</b>{tr.avg_match != null && <span className="tag brand">{tr.avg_match}% {t("ka_avg")}</span>}</div>
        <div className="grid2" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {[["ka_found", tr.found], ["ka_applied", tr.applied], ["ka_interviews", tr.interviews], ["ka_offers", tr.offers]].map(([k, n]) => (
            <div key={k} style={{ textAlign: "center" }}><b style={{ fontSize: 20 }}>{n}</b><div className="tiny soft">{t(k)}</div></div>
          ))}
        </div>
        {tr.applied > 0 && <div className="small soft">{t("ka_conv", { a: tr.to_interview ?? 0, b: tr.to_offer ?? 0 })}</div>}
        <div className="row">{Object.entries(tr.counts).filter(([, n]) => (n as number) > 0).map(([k, n]) => (
          <span key={k} className="tag">{t("ka_st")[k]} · {n as number}</span>))}</div>
      </div>
      <div className="card stack">
        <div className="row between"><b>🧬 {t("ka_map")}</b>
          <span className="small soft">{d.counts.confirmed} {t("ka_confirmed")} · {d.counts.pending} {t("ka_pending")}</span></div>
        {!d.confirmed.length && !d.pending.length && <p className="small soft">{t("ka_empty_map")}</p>}
        {d.experience_types.length > 0 && <div className="small"><b>{t("ka_types")}:</b> {d.experience_types.map((c: string) => cats[c] || c).join(", ")}</div>}
        {Object.entries(byCat).map(([cat, list]) => (
          <div key={cat} className="stack" style={{ gap: 6 }}>
            <span className="tiny soft" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>{cats[cat] || cat}</span>
            <div className="row">{list.map((s) => <span key={s.id} className={`tag ${s.kind === "hard" ? "good" : "info"}`} title={s.evidence}>✓ {name(s)}</span>)}</div>
          </div>
        ))}
        {d.pending.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="tiny soft" style={{ fontWeight: 700 }}>{t("ka_assume")}</span>
            <div className="row">{d.pending.map((s: any) => <span key={s.id} className="tag mid">~ {name(s)}</span>)}</div>
            <Link className="btn good sm" href="/cv">{t("confirm_all")}</Link>
          </div>
        )}
        {d.achievements.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="tiny soft" style={{ fontWeight: 700 }}>🏆 {t("ka_ach")}</span>
            {d.achievements.slice(0, 4).map((a: any, i: number) => <div key={i} className="quote">{a.sentence}</div>)}
          </div>
        )}
      </div>
      <Link className="card tap list-item" href="/career/experience">
        <div className="avatar" aria-hidden="true">📚</div>
        <div className="grow"><div className="h2">{t("ka_exp")}</div><div className="soft small">{t("ka_exp_sub")}</div></div>
      </Link>
      <Link className="card tap list-item" href="/career/vacancies">
        <div className="avatar" aria-hidden="true">🎯</div>
        <div className="grow"><div className="h2">{t("ka_vac")}</div><div className="soft small">{t("ka_vac_sub")}</div></div>
      </Link>
    </Screen>
  );
}
