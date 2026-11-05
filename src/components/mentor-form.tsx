"use client";
// Mentor self-registration / profile editing. A new or re-identified profile goes to moderation.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "./app";
import { fmtLabel } from "./ui";

const TZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Tashkent";

export function MentorForm({ initial }: { initial: any | null }) {
  const { me, t, lang, toast, fail } = useApp();
  const router = useRouter();
  const [m, setM] = useState<any>(initial || {
    specializations: [], languages: [], format: "online", duration: 60, price: 0, currency: "UZS", timezone: TZ,
    full_name: me.user.name || "", years: 0,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setM((x: any) => ({ ...x, [k]: v }));
  const toggle = (k: "specializations" | "languages", v: string) =>
    set(k, m[k].includes(v) ? m[k].filter((x: string) => x !== v) : [...m[k], v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/miniapp/mentor", { body: m });
      toast(t("saved"));
      router.push("/mentor/schedule");
    } catch (err) { fail(err); }
    setBusy(false);
  }

  const inp = (k: string, label: string, type = "text", extra: any = {}) => (
    <label className="f">{label}<input className="in" type={type} value={m[k] ?? ""} onChange={(e) => set(k, e.target.value)} {...extra} /></label>
  );
  const area = (k: string, label: string) => (
    <label className="f">{label}<textarea className="in" style={{ minHeight: 90 }} value={m[k] || ""} onChange={(e) => set(k, e.target.value)} /></label>
  );
  const cats = Object.entries(me.dicts.categories) as [string, any][];
  return (
    <form className="stack enter" onSubmit={submit}>
      <div className="h1">{initial === null ? t("mc_new") : t("edit_profile")}</div>
      {initial === null && <p className="soft small">{t("mc_new_t")}</p>}
      <div className="card stack">
        {inp("full_name", t("f_name"), "text", { required: true, maxLength: 120 })}
        {inp("title", t("f_title"), "text", { required: true, maxLength: 120 })}
        <div className="grid2">{inp("company", t("f_company"))}{inp("years", t("f_years"), "number", { min: 0, max: 60 })}</div>
        <div className="grid2">{inp("country", t("country"))}{inp("city", t("city"))}</div>
        {inp("linkedin", "LinkedIn", "url")}{inp("photo_url", t("f_photo"), "url")}{inp("email", t("f_email"), "email")}
      </div>
      <div className="card stack">{area("bio", t("f_bio"))}{area("experience", t("f_exp"))}{area("achievements", t("f_ach"))}{area("education", t("f_edu"))}{area("audience", t("f_aud"))}</div>
      <div className="card stack">
        <b className="small">{t("f_spec")}</b>
        <div className="row">{cats.map(([k, v]) => (
          <button key={k} type="button" className={`chip${m.specializations.includes(k) ? " on" : ""}`} onClick={() => toggle("specializations", k)}>{v[lang] || v.ru}</button>
        ))}</div>
        <b className="small">{t("f_langs")}</b>
        <div className="row">{["uz", "ru", "en"].map((l) => (
          <button key={l} type="button" className={`chip${m.languages.includes(l) ? " on" : ""}`} onClick={() => toggle("languages", l)}>{l.toUpperCase()}</button>
        ))}</div>
      </div>
      <div className="card stack">
        <div className="grid2">
          <label className="f">{t("f_format")}<select className="in" value={m.format} onChange={(e) => set("format", e.target.value)}>
            {["online", "offline", "both"].map((f) => <option key={f} value={f}>{fmtLabel(t, f)}</option>)}</select></label>
          <label className="f">{t("f_dur")}<select className="in" value={m.duration} onChange={(e) => set("duration", +e.target.value)}>
            {me.dicts.durations.map((x: number) => <option key={x} value={x}>{x}</option>)}</select></label>
        </div>
        <div className="grid2">{inp("price", t("f_price"), "number", { min: 0 })}
          <label className="f">{t("f_cur")}<select className="in" value={m.currency} onChange={(e) => set("currency", e.target.value)}>
            {["UZS", "USD"].map((c) => <option key={c}>{c}</option>)}</select></label></div>
        {inp("free_quota", t("f_quota"), "number", { min: 0 })}{inp("meeting_link", t("f_meet"), "url")}{inp("timezone", t("f_tz"))}
      </div>
      <button className={`btn primary block${busy ? " busy" : ""}`} type="submit" disabled={busy}>{initial === null ? t("send_mod") : t("save")}</button>
    </form>
  );
}
