"use client";
// Mentor profile with a Calendly-style picker: days with free slots, then times in the viewer's own time zone.
// The same screen reschedules an existing booking (?reschedule=<booking id>).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app";
import { Avatar, DoneCheck, Empty, fmtLabel, priceLabel, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { dayKey, fmtDate, fmtTime, wdIndex } from "@/lib/format";
import { haptic } from "@/lib/telegram";

const TZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Tashkent";
const PROFILE_FIELDS = ["email", "phone", "country", "city", "position", "company", "level", "linkedin", "bio", "goals"] as const;

export default function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const reschedule = useSearchParams().get("reschedule");
  const router = useRouter();
  const { me, t, lang, toast, fail } = useApp();
  const [d, setD] = useState<any>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState({ topic: "", why: "", expectation: "", problem: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api(`/api/miniapp/mentors/${id}`);
      setD(r);
      setProfile(Object.fromEntries(PROFILE_FIELDS.map((k) => [k, r.mentee?.[k] || ""])));
      setSlots(reschedule ? (await api(`/api/miniapp/mentors/${id}/slots?exclude=${reschedule}`)).slots : r.slots);
      setDay(null); setSlot(null);
    } catch (e) { fail(e); }
  }
  useEffect(() => { load(); }, [id, reschedule]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const s of slots) (out[dayKey(new Date(s))] ||= []).push(s);
    return out;
  }, [slots]);
  const days = useMemo(() => {
    const first = new Date(); first.setHours(0, 0, 0, 0);
    return Array.from({ length: 22 }, (_, i) => { const x = new Date(first); x.setDate(first.getDate() + i); return x; });
  }, []);
  const currentDay = day || Object.keys(byDay).sort()[0] || null;

  if (!d) return <Skeleton n={3} />;
  const m = d.mentor;

  async function doReschedule() {
    try {
      await api(`/api/miniapp/bookings/${reschedule}/reschedule`, { body: { start: slot } });
      toast(t("saved"));
      router.push("/bookings");
    } catch (e) { fail(e); }
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!answers.topic.trim()) return toast(t("required"), true);
    setBusy(true);
    try {
      await api("/api/miniapp/bookings", { body: { mentor_id: m.id, start: slot, answers, profile } });
      setStep("done");
      haptic("success");
    } catch (err: any) {
      if (err?.code === "slot_taken") { toast(err.message, true); setStep("pick"); await load(); }
      else fail(err);
    }
    setBusy(false);
  }

  if (step === "done") {
    return (
      <Screen className="reg">
        <DoneCheck />
        <div className="h1">{t("booked")}</div>
        <div className="card">{m.full_name} · {fmtDate(lang, slot!)}</div>
        <Link className="btn primary block" href="/bookings">{t("my_bookings")}</Link>
      </Screen>
    );
  }

  if (step === "form") {
    const field = (k: string, type = "text") => (
      <label className="f" key={k}>{t(k)}<input className="in" type={type} value={profile[k] || ""} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} /></label>
    );
    const area = (label: string, value: string, set: (v: string) => void) => (
      <label className="f">{label}<textarea className="in" maxLength={1000} style={{ minHeight: 80 }} value={value} onChange={(e) => set(e.target.value)} /></label>
    );
    return (
      <form className="stack enter" onSubmit={book}>
        <div className="h1">{t("book_title")}</div>
        <div className="card list-item"><Avatar m={m} />
          <div className="grow"><b>{m.full_name}</b>
            <div className="small soft">{fmtDate(lang, slot!, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {m.duration} {t("min")}</div>
            <div className="small"><b>{priceLabel(t, m)}</b></div></div></div>
        <div className="sec-title">1 · {t("step_profile")}</div>
        <p className="small soft">{t("prof_once")}</p>
        <div className="card stack">
          {field("email", "email")}{field("phone", "tel")}
          <div className="grid2">{field("country")}{field("city")}</div>
          {field("position")}
          <div className="grid2">{field("company")}{field("level")}</div>
          {field("linkedin", "url")}
          {area(t("bio"), profile.bio || "", (v) => setProfile({ ...profile, bio: v }))}
          {area(t("goals"), profile.goals || "", (v) => setProfile({ ...profile, goals: v }))}
        </div>
        <div className="sec-title">2 · {t("step_q")}</div>
        <div className="card stack">
          {area(t("q_topic"), answers.topic, (v) => setAnswers({ ...answers, topic: v }))}
          {area(t("q_why"), answers.why, (v) => setAnswers({ ...answers, why: v }))}
          {area(t("q_exp"), answers.expectation, (v) => setAnswers({ ...answers, expectation: v }))}
          {area(t("q_problem"), answers.problem, (v) => setAnswers({ ...answers, problem: v }))}
        </div>
        <div className="sec-title">3 · {t("step_ok")}</div>
        <div className="small soft">{me.has_cv ? t("cv_attached", { f: "CV" }) : t("cv_none")}</div>
        {m.price > 0 && <div className="warn">{t("pay_note")}</div>}
        <button className={`btn primary block${busy ? " busy" : ""}`} type="submit" disabled={busy}>{t("confirm_book")}</button>
      </form>
    );
  }

  const block = (title: string, text?: string) => text ? <div className="card"><b>{title}</b><p className="pre small" style={{ marginTop: 6 }}>{text}</p></div> : null;
  const times = currentDay ? byDay[currentDay] || [] : [];
  return (
    <Screen>
      <div className="card stack">
        <div className="list-item"><Avatar m={m} lg />
          <div className="grow"><div className="h1">{m.full_name}</div>
            <div className="soft">{m.title}{m.company ? " · " + m.company : ""}</div>
            <div className="small">{[m.city, m.country].filter(Boolean).join(", ")} · {t("years", { n: m.years })}{m.rating ? ` · ★ ${m.rating} (${m.reviews})` : ""}</div></div></div>
        <div className="row">{m.verified && <span className="tag good">✓ Verified</span>}{m.specialization_labels.map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
        <dl className="kv">
          <dt>{t("price")}</dt><dd><b>{priceLabel(t, m)}</b></dd>
          <dt>{t("duration")}</dt><dd>{m.duration} {t("min")}</dd>
          <dt>{t("format")}</dt><dd>{fmtLabel(t, m.format)}</dd>
          <dt>{t("langs")}</dt><dd>{m.languages.map((l: string) => l.toUpperCase()).join(", ")}</dd>
        </dl>
        {m.linkedin && <a className="small" style={{ color: "var(--brand)" }} href={m.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
      </div>
      <div className="card stack">
        {d.own ? <Link className="btn block" href="/mentor">{t("mentor_cabinet")}</Link> : !slots.length ? <Empty icon="🗓">{t("no_slots")}</Empty> : (
          <>
            <b>📅 {t("pick_day")}</b>
            <div className="days">
              {days.map((x) => {
                const k = dayKey(x);
                return (
                  <button key={k} type="button" className={`day${k === currentDay ? " on" : ""}`} disabled={!byDay[k]} onClick={() => { setDay(k); setSlot(null); }}>
                    <small>{t("wd")[wdIndex(x)]}</small><b>{x.getDate()}</b><small>{byDay[k] ? byDay[k].length : "—"}</small>
                  </button>
                );
              })}
            </div>
            <b>🕒 {t("pick_time", { tz: TZ })}</b>
            <div className="times">
              {times.map((s, i) => (
                <button key={s} type="button" className={`time${s === slot ? " on" : ""}`} style={{ ["--i" as any]: i }} onClick={() => setSlot(s)}>{fmtTime(s)}</button>
              ))}
            </div>
            <button className="btn primary block" type="button" disabled={!slot} onClick={() => (reschedule ? doReschedule() : setStep("form"))}>
              {reschedule ? t("reschedule") : t("continue")} →
            </button>
          </>
        )}
      </div>
      {block(t("about"), m.bio)}{block(t("experience"), m.experience)}{block(t("achievements"), m.achievements)}
      {block(t("education"), m.education)}{block(t("helps"), m.audience)}
      {m.review_list.length > 0 && <div className="sec-title">{t("reviews")}</div>}
      {m.review_list.map((r: any, i: number) => (
        <div key={i} className="card flat"><b>{"★".repeat(r.rating)}</b> <span className="small soft">{(r.full_name || "").split(" ")[0]}</span>
          {r.text && <p className="small" style={{ marginTop: 4 }}>{r.text}</p>}</div>
      ))}
    </Screen>
  );
}
