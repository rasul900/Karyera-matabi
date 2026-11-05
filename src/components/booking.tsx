"use client";
// A booking as the mentee or the mentor sees it, with the actions each side may take.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, money } from "@/lib/format";
import { Lang } from "@/lib/i18n";
import { tg } from "@/lib/telegram";
import { useApp } from "./app";
import { Avatar, Sheet, initials } from "./ui";

type Act = (action: string, b: any) => void;

export function BookingCard({ b, t, lang, asMentor = false, onAct, style }: {
  b: any; t: any; lang: Lang; asMentor?: boolean; onAct?: Act; style?: React.CSSProperties;
}) {
  const st = b.status, who = asMentor ? b.mentee : b.mentor;
  const cls = st === "confirmed" || st === "completed" ? "good" : st === "pending" ? "mid" : "bad";
  const a = b.answers || {};
  const btn = (label: string, action: string, kind = "") =>
    <button key={action} type="button" className={`btn sm ${kind}`} onClick={() => onAct?.(action, b)}>{label}</button>;
  const acts: React.ReactNode[] = [];
  if (onAct && !asMentor) {
    if (st === "confirmed" && b.mentor.meeting_link)
      acts.push(<a key="join" className="btn primary sm" href={b.mentor.meeting_link} target="_blank" rel="noopener noreferrer">{t("join")}</a>);
    if (b.can_change && b.free_change) acts.push(btn(t("reschedule"), "resched"));
    if (b.can_change) acts.push(btn(t("cancel"), "cancel", "bad"));
    if (b.can_complete || (st === "completed" && !b.review)) acts.push(btn(b.can_complete ? t("complete") : t("review"), "review", "good"));
  }
  if (onAct && asMentor) {
    if (st === "pending") { acts.push(btn(t("accept"), "accept", "good")); acts.push(btn(t("reject"), "reject", "bad")); }
    if (b.payment_status === "awaiting" && ["pending", "confirmed", "completed"].includes(st)) acts.push(btn(t("mark_paid"), "paid"));
    if (b.can_complete) acts.push(btn(t("complete"), "mcomplete", "good"));
    if (b.can_change) acts.push(btn(t("cancel"), "cancel"));
  }
  const facts = asMentor ? ([["position", who.position], ["company", who.company], ["level", who.level], ["city", who.city],
    ["email", who.email], ["phone", who.phone], ["linkedin", who.linkedin]] as const).filter(([, v]) => v) : [];
  return (
    <div className="card stack" style={style}>
      <div className="list-item">
        {asMentor ? <div className="avatar">{initials(who.name)}</div> : <Avatar m={who} />}
        <div className="grow">
          <b>{asMentor ? who.name : who.full_name}</b>
          <div className="small soft">{fmtDate(lang, b.start_iso, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          <div className="row" style={{ marginTop: 4 }}>
            <span className={`tag ${cls}`}>{t("b_st")[st]}</span>
            <span className="tag">{t("pay_st")[b.payment_status]}{b.price ? ` · ${money(b.price)} ${b.currency}` : ""}</span>
            {b.late_cancel ? <span className="tag bad">late</span> : null}
            {b.review && <span className="tag">★ {b.review.rating}</span>}
          </div>
        </div>
      </div>
      {!asMentor && a.topic && <div className="quote">{a.topic}</div>}
      {asMentor && (
        <details>
          <summary className="small" style={{ cursor: "pointer", color: "var(--brand)" }}>{t("answers")}</summary>
          <div className="stack small" style={{ marginTop: 8 }}>
            <dl className="kv">
              {facts.map(([k, v]) => <Pair key={k} k={t(k)} v={String(v)} />)}
              {who.education?.university && <Pair k={t("education")} v={`${who.education.university}, ${who.education.specialty || ""} ${who.education.grad_year || ""}`} />}
            </dl>
            {who.bio && <div className="quote">{who.bio}</div>}
            {who.goals && <div><b>{t("goals")}</b> {who.goals}</div>}
            {(who.skills || []).length > 0 && <div className="row">{who.skills.map((s: string) => <span key={s} className="tag">{s}</span>)}</div>}
            {([["q_topic", a.topic], ["q_why", a.why], ["q_exp", a.expectation], ["q_problem", a.problem]] as const).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><b>{String(t(k)).replace(" *", "")}</b><br />{v}</div>
            ))}
            {who.cv && onAct && <button type="button" className="btn sm" onClick={() => onAct("mentee-cv", b)}>{t("mentee_cv")}</button>}
          </div>
        </details>
      )}
      {b.mentee_notes && !asMentor && <div className="small pre">📝 {b.mentee_notes}</div>}
      {acts.length > 0 && <div className="row">{acts}</div>}
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}

/** Actions shared by the bookings page and the mentor cabinet, with the cancel / review sheets they need. */
export function useBookingActions(after: () => void) {
  const { t, toast, fail } = useApp();
  const router = useRouter();
  const [cancel, setCancel] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");

  const act: Act = async (action, b) => {
    try {
      if (action === "resched") return router.push(`/mentors/${b.mentor_id}?reschedule=${b.id}`);
      if (action === "cancel") { setReason(""); return setCancel(b); }
      if (action === "review") { setRating(0); setText(""); setNotes(""); return setReview(b); }
      if (action === "mentee-cv") {  // a signed 5-minute link: the Telegram initData never goes into a URL
        const { url } = await api(`/api/miniapp/mentor/bookings/${b.id}/cv-link`, { method: "POST" });
        const w = tg();
        return w?.openLink ? w.openLink(url) : window.open(url, "_blank");
      }
      if (action === "mcomplete") await api(`/api/miniapp/bookings/${b.id}/complete`, { body: {} });
      else await api(`/api/miniapp/bookings/${b.id}/${action}`, { method: "POST" });
      toast(t("saved"));
      after();
    } catch (e) { fail(e); }
  };

  const sheets = (
    <>
      <Sheet open={!!cancel} onClose={() => setCancel(null)} closeLabel={t("close")}>
        <div className="h2">{t("cancel_q")}</div>
        {cancel && !cancel.free_change && <div className="warn">{t("late_warn")}</div>}
        <label className="f">{t("reason")}<input className="in" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <button className="btn bad block" type="button" onClick={async () => {
          try { await api(`/api/miniapp/bookings/${cancel.id}/cancel`, { body: { reason } }); setCancel(null); toast(t("saved")); after(); }
          catch (e) { fail(e); }
        }}>{t("cancel")}</button>
      </Sheet>
      <Sheet open={!!review} onClose={() => setReview(null)} closeLabel={t("close")}>
        <div className="h2">{t("review")}</div>
        <b className="small">{t("rate")}</b>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" data-star={i} aria-label={String(i)} className={i <= rating ? "on" : ""} onClick={() => setRating(i)}>★</button>
          ))}
        </div>
        <label className="f">{t("review_text")}<textarea className="in" maxLength={1000} style={{ minHeight: 80 }} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className="f">{t("notes")}<textarea className="in" maxLength={3000} style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <button className="btn primary block" type="button" onClick={async () => {
          try {
            await api(`/api/miniapp/bookings/${review.id}/complete`, { body: { rating: rating || null, text, notes } });
            setReview(null); toast(t("saved")); after();
          } catch (e) { fail(e); }
        }}>{t("save")}</button>
      </Sheet>
    </>
  );
  return { act, sheets };
}
