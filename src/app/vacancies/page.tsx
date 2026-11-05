"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { Empty, NeedProfile, Screen, Skeleton, VacCard } from "@/components/ui";
import { api } from "@/lib/api";
import { openBot } from "@/lib/telegram";

export default function Vacancies() {
  const { me, t, isGrad, profileOk, profName, skillName, fail } = useApp();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [profession, setProfession] = useState("");
  const [fav, setFav] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => { const id = setTimeout(() => setQuery(q.trim()), 350); return () => clearTimeout(id); }, [q]);
  useEffect(() => {
    if (!isGrad || !profileOk) return;
    setData(null);
    const p = new URLSearchParams({ profession, q: query, fav: fav ? "1" : "" });
    api("/api/miniapp/vacancies?" + p).then(setData).catch(fail);
  }, [profession, query, fav, isGrad, profileOk, fail]);

  if (!isGrad) return <Empty icon="💼">—</Empty>;
  if (!profileOk) return <NeedProfile t={t} link={me.profile_link} onOpen={openBot} />;

  return (
    <div className="stack enter">
      <input className="in" type="search" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <button className={`chip${!profession && !fav ? " on" : ""}`} onClick={() => { setProfession(""); setFav(false); }}>{t("all")}</button>
        <button className={`chip${fav ? " on" : ""}`} onClick={() => { setFav(true); setProfession(""); }}>{t("favs")}</button>
        {Object.keys(me.dicts.professions).map((k) => (
          <button key={k} className={`chip${profession === k ? " on" : ""}`} onClick={() => { setProfession(k); setFav(false); }}>
            {profName(k)} · {me.counts[k] || 0}
          </button>
        ))}
      </div>
      {!data ? <Skeleton n={3} /> : (
        <Screen>
          {!data.verified && <div className="info">{t("verify_hint")}</div>}
          {data.items.length ? data.items.map((v: any) => <VacCard key={v.id} v={v} t={t} skillName={skillName} />)
            : <Empty icon="🔎">{t("vac_none")}</Empty>}
        </Screen>
      )}
      <Link className="btn ghost block" href="/applications">📨 {t("my_apps")}</Link>
    </div>
  );
}
