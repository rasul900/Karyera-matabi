"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Empty, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, sqlIso } from "@/lib/format";

export default function Applications() {
  const { t, lang, fail } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { api("/api/miniapp/applications").then((d) => setItems(d.items)).catch(fail); }, [fail]);
  if (!items) return <Skeleton n={3} />;
  return (
    <Screen>
      <div className="h1">{t("my_apps")}</div>
      {items.length ? items.map((a) => (
        <Link key={a.id} className="card tap row between" href={`/vacancies/${a.vacancy_id}`}>
          <div className="grow"><b>{a.title}</b><div className="soft small">{a.company_name} · {fmtDate(lang, sqlIso(a.created_at), { day: "numeric", month: "short" })}</div></div>
          <span className={`tag ${a.status === "offer" || a.status === "interview" ? "good" : a.status === "rejected" ? "bad" : "info"}`}>{t("app_st")[a.status]}</span>
        </Link>
      )) : <Empty icon="📨">—</Empty>}
    </Screen>
  );
}
