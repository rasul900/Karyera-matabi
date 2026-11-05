"use client";
// Weekly availability (Mon = 0) in the mentor's time zone plus closed dates; slots are cut by session length.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { MentorForm } from "@/components/mentor-form";
import { Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function Schedule() {
  const { t, toast, fail } = useApp();
  const router = useRouter();
  const [s, setS] = useState<any>(undefined);
  const [off, setOff] = useState("");
  useEffect(() => {
    api("/api/miniapp/mentor").then((d) => setS(d.mentor ? {
      rules: d.availability.rules.map((r: any) => ({ ...r })), days_off: [...d.availability.days_off],
      duration: d.mentor.duration, tz: d.mentor.timezone,
    } : null)).catch(fail);
  }, [fail]);
  if (s === undefined) return <Skeleton n={4} />;
  if (s === null) return <MentorForm initial={null} />;

  const setRule = (i: number, k: string, v: string) => setS({ ...s, rules: s.rules.map((r: any, j: number) => (j === i ? { ...r, [k]: v } : r)) });
  async function save() {
    try { await api("/api/miniapp/mentor/availability", { body: { rules: s.rules, days_off: s.days_off } }); toast(t("saved")); router.push("/mentor"); }
    catch (e) { fail(e); }
  }
  return (
    <Screen>
      <div className="h1">{t("sch_title")}</div>
      <p className="small soft">{t("sch_hint")} ({s.tz}, {s.duration} {t("min")})</p>
      {(t("wd_full") as string[]).map((name, wd) => {
        const rs = s.rules.map((r: any, idx: number) => ({ ...r, idx })).filter((r: any) => +r.weekday === wd);
        return (
          <div className="card stack" key={wd}>
            <div className="row between"><b>{name}</b>
              <button className="btn sm" type="button" onClick={() => setS({ ...s, rules: [...s.rules, { weekday: wd, start: "10:00", end: "12:00" }] })}>{t("add_window")}</button></div>
            {rs.length ? rs.map((r: any) => (
              <div className="win" key={r.idx}>
                <input className="in" type="time" value={r.start} onChange={(e) => setRule(r.idx, "start", e.target.value)} /><span>—</span>
                <input className="in" type="time" value={r.end} onChange={(e) => setRule(r.idx, "end", e.target.value)} />
                <button className="icon-btn" type="button" aria-label={t("remove")} onClick={() => setS({ ...s, rules: s.rules.filter((_: any, j: number) => j !== r.idx) })}>✕</button>
              </div>
            )) : <span className="small soft">{t("unavailable")}</span>}
          </div>
        );
      })}
      <div className="card stack">
        <b>{t("days_off")}</b>
        <div className="row">
          <input className="in grow" type="date" value={off} onChange={(e) => setOff(e.target.value)} />
          <button className="btn sm" type="button" onClick={() => { if (off && !s.days_off.includes(off)) setS({ ...s, days_off: [...s.days_off, off] }); }}>{t("add_day")}</button>
        </div>
        <div className="row">{s.days_off.map((d: string) => (
          <span className="tag" key={d}>{d} <button className="icon-btn" type="button" style={{ width: 22, height: 22 }} aria-label={t("remove")}
            onClick={() => setS({ ...s, days_off: s.days_off.filter((x: string) => x !== d) })}>✕</button></span>
        ))}</div>
      </div>
      <button className="btn primary block" type="button" onClick={save}>{t("save")}</button>
    </Screen>
  );
}
