// Thin typed access to the Telegram WebApp SDK (loaded in the root layout before the app starts).
export type TG = {
  initData: string;
  initDataUnsafe?: any;
  colorScheme?: "light" | "dark";
  ready(): void;
  expand(): void;
  close(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  setHeaderColor?(color: string): void;
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { selectionChanged(): void; notificationOccurred(t: "success" | "error" | "warning"): void; impactOccurred(s: string): void };
};

export function tg(): TG | null {
  if (typeof window === "undefined") return null;
  return ((window as any).Telegram && (window as any).Telegram.WebApp) || null;
}

export function haptic(kind: "select" | "success" | "error" | "light") {
  try {
    const h = tg()?.HapticFeedback;
    if (!h) return;
    if (kind === "select") h.selectionChanged();
    else if (kind === "success" || kind === "error") h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch { /* older clients */ }
}

/** ?dev_tg=<id> works only against a backend running with DEV_MODE=1 (local development). */
export function devTelegramId(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromUrl = new URLSearchParams(location.search).get("dev_tg");
    if (fromUrl) sessionStorage.setItem("dev_tg", fromUrl);
    return fromUrl || sessionStorage.getItem("dev_tg") || "";
  } catch {
    return "";
  }
}

export function openBot(link: string) {
  const w = tg();
  if (w?.openTelegramLink) {
    w.openTelegramLink(link);
    setTimeout(() => w.close?.(), 300);
  } else window.open(link, "_blank");
}
