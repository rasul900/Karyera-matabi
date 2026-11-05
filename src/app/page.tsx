"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { BookingCard } from "@/components/booking";
import { MARK, NeedProfile, Screen, VacCard } from "@/components/ui";
import { api } from "@/lib/api";
import { openBot } from "@/lib/telegram";

export default function Home() {
  const { me, t, isGrad, profileOk, skillName, lang } = useApp();
  const [matches, setMatches] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (isGrad && profileOk && me.has_cv) api("/api/miniapp/vacancies").then((d) => setMatches(d.items.slice(0, 3))).catch(() => {});
    api("/api/miniapp/bookings").then((d) => setBookings(
      d.items.filter((b: any) => ["pending", "confirmed"].includes(b.status) && new Date(b.end_iso) > new Date()).slice(0, 2))).catch(() => {});
  }, [isGrad, profileOk, me.has_cv]);

  const name = (me.user.name || me.user.username || "").split(" ")[0];
  const st = me.profile ? me.profile.verification_status : "none";
  return (
    <Screen>
      <div className="hero stack">
        {MARK("decor")}
        <div className="h1">{t("hi", { name })}</div>
        <p>{isGrad ? t("hero_cv") : t("find_mentor_t")}</p>
        {isGrad && <Link className="btn white" href="/cv">{me.has_cv ? t("hero_again") : t("hero_btn")}</Link>}
      </div>
      {isGrad && (
        <div className="card row between">
          <span className="soft">{t("status")}</span>
          <span className={`tag ${st === "verified" ? "good" : st === "pending" ? "mid" : "bad"}`}>{t("st_" + st)}</span>
        </div>
      )}
      {isGrad && !profileOk && <NeedProfile t={t} link={me.profile_link} onOpen={openBot} />}
      {matches.length > 0 && (
        <div className="row between">
          <div className="sec-title">{t("top_matches")}</div>
          <Link className="small" href="/vacancies" style={{ color: "var(--brand)" }}>{t("all")} →</Link>
        </div>
      )}
      {matches.map((v) => <VacCard key={v.id} v={v} t={t} skillName={skillName} />)}
      {bookings.length > 0 && <div className="sec-title">{t("upcoming")}</div>}
      {bookings.map((b) => <BookingCard key={b.id} b={b} lang={lang} t={t} />)}
      <Link className="card tap list-item" href="/mentors">
        <div className="avatar" aria-hidden="true">🧑‍🏫</div>
        <div className="grow"><div className="h2">{t("find_mentor")}</div><div className="soft small">{t("find_mentor_t")}</div></div>
      </Link>
      <Link className="btn ghost block" href="/mentor">{me.mentor ? t("mentor_cabinet") : t("become_mentor")}</Link>
    </Screen>
  );
}
