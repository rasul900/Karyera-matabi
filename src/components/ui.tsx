"use client";
// Shared building blocks: animated screen container, match ring with count-up, cards, skeletons, bottom sheet.
import Link from "next/link";
import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { fmtDate, money } from "@/lib/format";

export const MARK = (cls: string) => (
  <svg className={cls} viewBox="0 0 118 117" aria-hidden="true"><path fill="currentColor" d="M0 0H118V21H88V40H118V51H64V71H118V78H40V99H118V117H0Z" /></svg>
);

/** Children rise in one after another (CSS `.enter > *` with a per-child delay). */
export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  let i = 0;
  return (
    <div className={`stack enter ${className}`}>
      {Children.map(children, (c) => {
        if (!isValidElement(c)) return c;
        const n = Math.min(i++, 12);
        const el = c as React.ReactElement<any>;
        return cloneElement(el, { style: { ...(el.props.style || {}), ["--i" as any]: n } });
      })}
    </div>
  );
}

export function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value || matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export function Ring({ p, label }: { p: number; label: string }) {
  const c = p >= 70 ? "var(--good)" : p >= 40 ? "var(--mid)" : "var(--brand)";
  return (
    <div className="ring" style={{ ["--p" as any]: p, ["--c" as any]: c }} role="img" aria-label={`${p}% ${label}`}>
      <span><CountUp value={p} />%</span>
    </div>
  );
}

export function Skeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: n }, (_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel" style={{ width: 52, height: 52, borderRadius: "50%" }} />
          <div className="grow stack" style={{ gap: 8 }}>
            <div className="skel" style={{ height: 14, width: "70%" }} />
            <div className="skel" style={{ height: 11, width: "45%" }} />
            <div className="skel" style={{ height: 11, width: "55%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoneCheck({ small }: { small?: boolean }) {
  return (
    <svg className={`done-check${small ? " sm" : ""}`} viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="45" cy="45" r="40" /><path d="M27 46l12 12 24-26" />
    </svg>
  );
}

export const initials = (name: string) => (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Avatar({ m, lg }: { m: any; lg?: boolean }) {
  if (m?.photo_url) return <img className={`avatar${lg ? " lg" : ""}`} src={m.photo_url} alt="" loading="lazy" />;
  return <div className={`avatar${lg ? " lg" : ""}`} aria-hidden="true">{initials(m?.full_name || m?.name)}</div>;
}

export function Empty({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <div className="empty"><div className="big">{icon}</div><div>{children}</div></div>;
}

export function salary(t: any, v: any) {
  if (v.salary_from && v.salary_to) return `${money(v.salary_from)} – ${money(v.salary_to)} UZS`;
  if (v.salary_from) return `${t("salary_from")} ${money(v.salary_from)} UZS`;
  if (v.salary_to) return `${t("salary_to")} ${money(v.salary_to)} UZS`;
  return t("salary_any");
}

export function VacCard({ v, t, skillName, style }: { v: any; t: any; skillName: (s: string) => string; style?: React.CSSProperties }) {
  return (
    <Link className="card tap list-item" href={`/vacancies/${v.id}`} style={style}>
      <Ring p={v.percent || 0} label={t("match")} />
      <div className="grow">
        <div className="h2">{v.title}</div>
        <div className="soft small">{v.company_name} · {v.city}</div>
        <div className="small" style={{ marginTop: 4 }}><b>{salary(t, v)}</b></div>
        <div className="row" style={{ marginTop: 6 }}>
          {v.same_field && <span className="tag brand">{t("same_field")}</span>}
          {(v.matched || []).slice(0, 3).map((s: string) => <span key={s} className="tag good">✓ {skillName(s)}</span>)}
          {(v.partial || []).slice(0, 2).map((s: string) => <span key={s} className="tag mid">~ {skillName(s)}</span>)}
        </div>
      </div>
    </Link>
  );
}

export function fmtLabel(t: any, k: string) {
  return ({ online: t("m_online"), offline: t("m_offline"), both: `${t("m_online")} / ${t("m_offline")}` } as any)[k] || k;
}
export const priceLabel = (t: any, m: any) => (m.price ? `${money(m.price)} ${m.currency}` : t("free"));

export function MentorCard({ m, t, lang, style }: { m: any; t: any; lang: any; style?: React.CSSProperties }) {
  return (
    <div className="card stack" style={style}>
      <Link className="list-item" href={`/mentors/${m.id}`}>
        <Avatar m={m} />
        <div className="grow">
          <div className="h2">{m.full_name}</div>
          <div className="soft small">{m.title}{m.company ? " · " + m.company : ""}</div>
          <div className="row small" style={{ marginTop: 4 }}>
            <span>{t("years", { n: m.years })}</span>
            {m.rating && <span>★ {m.rating} ({m.reviews})</span>}
          </div>
        </div>
      </Link>
      <div className="row">{m.specialization_labels.slice(0, 3).map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
      <div className="row between">
        <div className="small"><b>{priceLabel(t, m)}</b> · {m.duration} {t("min")} · {fmtLabel(t, m.format)}<br />
          <span className="soft tiny">{m.next_slot ? t("next_slot", { d: fmtDate(lang, m.next_slot) }) : t("no_slots")}</span>
        </div>
        <Link className="btn primary sm" href={`/mentors/${m.id}`}>{t("book")}</Link>
      </div>
    </div>
  );
}

/** Bottom sheet with slide-in / slide-out. */
export function Sheet({ open, onClose, children, closeLabel }: { open: boolean; onClose: () => void; children: React.ReactNode; closeLabel: string }) {
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<any>(null);
  useEffect(() => {
    if (open) { setShown(true); setLeaving(false); return; }
    if (!shown) return;
    setLeaving(true);
    ref.current = setTimeout(() => { setShown(false); setLeaving(false); }, 220);
    return () => clearTimeout(ref.current);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  return (
    <div className={`sheet-bg${leaving ? " out" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet stack" role="dialog" aria-modal="true">
        <div className="grip" />
        {children}
        <button className="btn ghost block" type="button" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  );
}

export function RegScreen({ t, link, error, onCheck, onOpen }: { t: any; link?: string; error?: string; onCheck: () => void; onOpen: (l: string) => void }) {
  return (
    <Screen className="reg">
      <div className="reg-mark">{MARK("")}</div>
      <div className="h1">{t("reg_title")}</div>
      <p className="soft">{t("reg_text")}</p>
      <p className="small soft">{t("reg_steps")}</p>
      {error && <div className="warn">{t("open_in_tg")}</div>}
      <button className="btn primary block" type="button" onClick={() => link && onOpen(link)} disabled={!link}>{t("reg_btn")}</button>
      <button className="btn ghost block" type="button" onClick={onCheck}>{t("reg_check")}</button>
      <div className="trust">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" /></svg>{t("trust")}
      </div>
    </Screen>
  );
}

export function NeedProfile({ t, link, onOpen }: { t: any; link: string; onOpen: (l: string) => void }) {
  return (
    <div className="card stack" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 42 }}>👤</div>
      <div className="h2">{t("need_profile_t")}</div>
      <p className="soft">{t("need_profile")}</p>
      <button className="btn primary block" type="button" onClick={() => onOpen(link)}>{t("need_profile_btn")}</button>
    </div>
  );
}
