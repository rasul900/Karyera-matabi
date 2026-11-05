"use client";
// App shell: Telegram init, the user's state from /api/miniapp/me, the registration gate (nothing opens before
// registration in the bot), header, bottom tabs, toasts, Telegram BackButton, ripples and haptics.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Lang, translate } from "@/lib/i18n";
import { EMP_UZ, FMT_UZ, PROF_UZ } from "@/lib/format";
import { haptic, openBot, tg } from "@/lib/telegram";
import { MARK, RegScreen, Skeleton } from "./ui";

type Ctx = {
  me: any;
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => any;
  toast: (msg: string, err?: boolean) => void;
  fail: (e: unknown) => void;
  reload: () => Promise<void>;
  setMe: (fn: (m: any) => any) => void;
  isGrad: boolean;
  profileOk: boolean;
  profName: (k: string) => string;
  fmtName: (k: string) => string;
  empName: (k: string) => string;
  skillName: (n: string) => string;
};

const AppContext = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
};

const TABS = [
  { href: "/", key: "tab_home", icon: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
  { href: "/vacancies", key: "tab_vac", icon: "M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 0h2V5h-2z" },
  { href: "/career", key: "ka_tab", icon: "M12 2l2.6 6.3L21 9l-5 4.3L17.5 20 12 16.6 6.5 20 8 13.3 3 9l6.4-.7z", cls: "tab-cv" },
  { href: "/mentors", key: "tab_mentors", icon: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z" },
  { href: "/bookings", key: "tab_bookings", icon: "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM5 9h14v11H5zm2 2v3h3v-3z" },
];
const TOP = new Set(TABS.map((x) => x.href));

function tabOf(path: string): string {
  if (path.startsWith("/vacancies") || path.startsWith("/applications")) return "/vacancies";
  if (path.startsWith("/mentors")) return "/mentors";
  if (path.startsWith("/bookings") || path.startsWith("/mentor")) return "/bookings";
  if (path.startsWith("/cv") || path.startsWith("/career")) return "/career";
  return "/";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMeState] = useState<any>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const [bootError, setBootError] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<{ text: string; err: boolean; id: number } | null>(null);
  const timer = useRef<any>(null);
  const path = usePathname();
  const router = useRouter();

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  const toast = useCallback((text: string, err = false) => {
    setToastMsg({ text, err, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 3200);
    haptic(err ? "error" : "success");
  }, []);

  const reload = useCallback(async () => {
    try {
      const m = await api("/api/miniapp/me");
      setMeState(m);
      setLang(m.lang === "ru" ? "ru" : "uz");
      setBootError("");
    } catch (e: any) {
      setBootError(e?.message || "error");
    }
  }, []);

  const fail = useCallback((e: unknown) => {
    const err = e as ApiError;
    if (err?.code === "need_registration") { setMeState(null); reload(); return; }
    if (err?.code === "rate_limited") { toast(translate(lang, "slow"), true); return; }
    const extra = err?.errors?.length ? ": " + err.errors.join("; ") : "";
    toast((err?.message || translate(lang, "err")) + extra, true);
  }, [lang, reload, toast]);

  // Telegram SDK: ready/expand, theme, a deep link (?screen=mentors) from the bot
  useEffect(() => {
    const w = tg();
    if (w) {
      w.ready();
      w.expand();
      if (w.colorScheme) document.documentElement.dataset.theme = w.colorScheme;
      try { w.setHeaderColor?.("secondary_bg_color"); } catch { /* old client */ }
      const start = w.initDataUnsafe?.start_param;
      if (start && /^[a-z-]+$/.test(start)) router.replace("/" + start);
    }
    const screen = new URLSearchParams(location.search).get("screen");
    if (screen && /^[a-z-]+$/.test(screen)) router.replace("/" + screen);
    reload();
  }, [reload, router]);

  // Telegram's own back button on nested screens
  useEffect(() => {
    const back = tg()?.BackButton;
    if (!back) return;
    const go = () => router.back();
    if (TOP.has(path)) back.hide(); else back.show();
    back.onClick(go);
    return () => back.offClick(go);
  }, [path, router]);

  // ripples on buttons, haptic ticks on selections (disabled for reduced motion)
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const down = (e: PointerEvent) => {
      const b = (e.target as HTMLElement)?.closest?.(".btn") as HTMLElement | null;
      if (!b || reduced) return;
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(span);
      setTimeout(() => span.remove(), 650);
    };
    const click = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.(".chip,.day,.time,[data-star],.seg button,.tabs a")) haptic("select");
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("click", click, true);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("click", click, true); };
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dicts = me?.dicts;
    return {
      me, lang, t, toast, fail, reload,
      setMe: (fn) => setMeState((m: any) => fn(m)),
      isGrad: me?.user?.role === "graduate",
      profileOk: !!me?.registration?.profile_ok,
      profName: (k) => (lang === "uz" && PROF_UZ[k]) || dicts?.professions?.[k] || k,
      fmtName: (k) => (lang === "uz" && FMT_UZ[k]) || dicts?.formats?.[k] || k,
      empName: (k) => (lang === "uz" && EMP_UZ[k]) || dicts?.employment?.[k] || k,
      skillName: (n) => dicts?.skills?.[n]?.[lang] || n,
    };
  }, [me, lang, t, toast, fail, reload]);

  const switchLang = () => {
    const next: Lang = lang === "uz" ? "ru" : "uz";
    setLang(next);
    if (me?.registration?.registered) api("/api/miniapp/lang", { body: { lang: next } }).catch(() => {});
  };

  const registered = !!me?.registration?.registered;
  let content: React.ReactNode;
  if (!me && !bootError) content = <Skeleton n={4} />;
  else if (!registered) content = <RegScreen t={t} link={me?.bot_link} error={bootError} onCheck={reload} onOpen={openBot} />;
  else content = children;

  return (
    <AppContext.Provider value={value}>
      <header className="top">
        {!TOP.has(path) && registered && (
          <button className="icon-btn" type="button" aria-label={t("back")} onClick={() => router.back()}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div className="brand">{MARK("mark")}<span className="word">Karyera<br />Maktabi</span></div>
        <button className="lang" type="button" aria-label="Til / Язык" onClick={switchLang}>{lang.toUpperCase()}</button>
      </header>
      <main className="view" aria-live="polite">{content}</main>
      {registered && (
        <nav className="tabs">
          {TABS.map((x) => (
            <Link key={x.href} href={x.href} className={`${x.cls || ""}${tabOf(path) === x.href ? " on" : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={x.icon} /></svg>
              <span>{t(x.key)}</span>
            </Link>
          ))}
        </nav>
      )}
      {toastMsg && <div key={toastMsg.id} className={`toast${toastMsg.err ? " err" : ""}`} role="status">{toastMsg.text}</div>}
    </AppContext.Provider>
  );
}
