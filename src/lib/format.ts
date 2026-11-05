import { LANG_TAG, Lang, translate } from "./i18n";

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export const PROF_UZ: Record<string, string> = { it: "IT va dasturlash", finance: "Moliya", marketing: "Marketing", law: "Huquq",
  education: "Ta'lim", engineering: "Muhandislik", design: "Dizayn", sales: "Savdo va xizmat", health: "Tibbiyot va salomatlik",
  hr: "HR va kadrlar", logistics: "Logistika", tourism: "Turizm va mehmonxona", media: "Media va jurnalistika", agro: "Qishloq xo'jaligi" };
export const FMT_UZ: Record<string, string> = { office: "Ofis", remote: "Masofaviy", hybrid: "Gibrid" };
export const EMP_UZ: Record<string, string> = { full: "To'liq ish kuni", part: "Qisman bandlik", internship: "Stajirovka" };

const pad = (n: number) => String(n).padStart(2, "0");
export const wdIndex = (d: Date) => (d.getDay() + 6) % 7; // Monday = 0
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtTime = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function fmtDate(lang: Lang, iso: string, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) {
  if (lang !== "uz") return new Date(iso).toLocaleString(LANG_TAG[lang], o);
  const d = new Date(iso); // browsers render uz-UZ inconsistently ("M11"), so Uzbek dates are built by hand
  const wd = o.weekday ? (o.weekday === "long" ? translate(lang, "wd_full") : translate(lang, "wd"))[wdIndex(d)] + ", " : "";
  return `${wd}${d.getDate()}-${UZ_MONTHS[d.getMonth()]}${o.hour ? ", " + fmtTime(iso) : ""}`;
}

export const money = (n: number | null | undefined) =>
  n || n === 0 ? Number(n).toLocaleString("ru-RU").replace(/ /g, " ") : "";

export const sqlIso = (s: string) => s.replace(" ", "T") + "Z";
