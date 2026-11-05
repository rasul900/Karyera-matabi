"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Empty, MentorCard, Screen, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

type F = { category: string; price: string; language: string; fmt: string; sort: string; q: string };

export default function Mentors() {
  const { me, t, lang, fail } = useApp();
  const [f, setF] = useState<F>({ category: "", price: "", language: "", fmt: "", sort: "match", q: "" });
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => { const id = setTimeout(() => setF((x) => ({ ...x, q: q.trim() })), 350); return () => clearTimeout(id); }, [q]);
  useEffect(() => {
    setItems(null);
    api("/api/miniapp/mentors?" + new URLSearchParams(f)).then((d) => setItems(d.items)).catch(fail);
  }, [f, fail]);

  const toggle = (k: keyof F, v: string) => setF((x) => ({ ...x, [k]: k !== "sort" && x[k] === v ? "" : v }));
  const chip = (k: keyof F, v: string, label: string) =>
    <button key={k + v} type="button" className={`chip${f[k] === v ? " on" : ""}`} onClick={() => toggle(k, v)}>{label}</button>;
  const cats = Object.entries(me.dicts.categories) as [string, any][];

  return (
    <div className="stack enter">
      <div className="h1">{t("tab_mentors")}</div>
      <input className="in" type="search" placeholder={t("m_search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{chip("category", "", t("all"))}{cats.map(([k, v]) => chip("category", k, v[lang] || v.ru))}</div>
      <div className="chips">
        {chip("price", "", "💰 " + t("all"))}{chip("price", "free", t("m_free"))}{chip("price", "paid", t("m_paid"))}
        {chip("fmt", "online", t("m_online"))}{chip("fmt", "offline", t("m_offline"))}
        {chip("language", "uz", "🇺🇿 UZ")}{chip("language", "ru", "🇷🇺 RU")}{chip("language", "en", "🇬🇧 EN")}
      </div>
      <div className="seg">
        {["match", "rating", "price"].map((s) => (
          <button key={s} type="button" className={f.sort === s ? "on" : ""} onClick={() => toggle("sort", s)}>{t("m_sort_" + s)}</button>
        ))}
      </div>
      {!items ? <Skeleton n={3} /> : (
        <Screen>{items.length ? items.map((m) => <MentorCard key={m.id} m={m} t={t} lang={lang} />) : <Empty icon="🧑‍🏫">{t("m_none")}</Empty>}</Screen>
      )}
    </div>
  );
}
