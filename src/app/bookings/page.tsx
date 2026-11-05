"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { BookingCard, useBookingActions } from "@/components/booking";
import { Empty, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function Bookings() {
  const { me, t, lang, fail } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  const load = useCallback(() => api("/api/miniapp/bookings").then((d) => setItems(d.items)).catch(fail), [fail]);
  const { act, sheets } = useBookingActions(load);
  useEffect(() => { load(); }, [load]);
  if (!items) return <Skeleton n={3} />;
  return (
    <>
      <Screen>
        <div className="row between">
          <div className="h1">{t("my_bookings")}</div>
          <Link className="btn sm" href="/mentor">{me.mentor ? t("as_mentor") : t("become_mentor")}</Link>
        </div>
        {items.length ? items.map((b) => <BookingCard key={b.id} b={b} t={t} lang={lang} onAct={act} />) : (
          <Empty icon="📅">{t("no_bookings")}<br /><br /><Link className="btn primary" href="/mentors">{t("go_mentors")}</Link></Empty>
        )}
      </Screen>
      {sheets}
    </>
  );
}
