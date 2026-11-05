"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { BookingCard, useBookingActions } from "@/components/booking";
import { MentorForm } from "@/components/mentor-form";
import { Avatar, Empty, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { money } from "@/lib/format";

export default function MentorCabinet() {
  const { t, lang, fail, setMe } = useApp();
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState("pending");
  const load = useCallback(() => api("/api/miniapp/mentor").then((r) => {
    setD(r);
    if (r.mentor) setMe((m: any) => ({ ...m, mentor: { id: r.mentor.id, status: r.mentor.status } }));
  }).catch(fail), [fail, setMe]);
  const { act, sheets } = useBookingActions(load);
  useEffect(() => { load(); }, [load]);

  if (!d) return <Skeleton n={3} />;
  if (!d.mentor) return <MentorForm initial={null} />;
  const m = d.mentor, g = d.bookings;
  const tabs: [string, string, any[]][] = [["pending", t("apps_new"), g.pending], ["confirmed", t("apps_conf"), g.confirmed],
    ["completed", t("apps_done"), g.completed], ["other", t("apps_other"), [...g.rejected, ...g.cancelled]]];
  const cur = tabs.find((x) => x[0] === tab) || tabs[0];
  const earn = Object.entries(d.earnings) as [string, any][];
  return (
    <>
      <Screen>
        <div className="h1">{t("mc_title")}</div>
        <div className="card list-item"><Avatar m={m} />
          <div className="grow"><b>{m.full_name}</b><div className="small soft">{m.title}</div>
            <span className={`tag ${m.status === "verified" ? "good" : m.status === "pending" ? "mid" : "bad"}`}>{t("m_status")[m.status]}</span></div></div>
        <div className="grid2"><Link className="btn" href="/mentor/edit">{t("edit_profile")}</Link><Link className="btn" href="/mentor/schedule">{t("schedule")}</Link></div>
        <div className="grid2">
          <div className="stat"><span className="small soft">{t("sessions")}</span><b>{m.sessions}</b></div>
          <div className="stat"><span className="small soft">★</span><b>{m.rating || "—"}</b></div>
        </div>
        {earn.length > 0 && (
          <div className="card"><b>{t("earnings")}</b>
            {earn.map(([c, e]) => (
              <div key={c} className="row between small"><span>{e.sessions} {t("sessions")} · {t("commission", { p: d.commission_pct })}</span><b>{money(e.net)} {c}</b></div>
            ))}
          </div>
        )}
        <div className="chips">
          {tabs.map(([k, label, items]) => <button key={k} type="button" className={`chip${k === cur[0] ? " on" : ""}`} onClick={() => setTab(k)}>{label} · {items.length}</button>)}
        </div>
        {cur[2].length ? cur[2].map((b) => <BookingCard key={b.id} b={b} t={t} lang={lang} asMentor onAct={act} />) : <Empty icon="📭">{t("no_apps")}</Empty>}
      </Screen>
      {sheets}
    </>
  );
}
