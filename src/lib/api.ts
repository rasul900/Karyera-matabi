import { devTelegramId, tg } from "./telegram";

export class ApiError extends Error {
  code?: string;
  errors: string[] = [];
  status = 0;
}

const TZ = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent" : "Asia/Tashkent";

/** Calls the Python API (same origin, forwarded by next.config rewrites). Identity = signed Telegram initData. */
export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Tz": TZ };
  const init = tg()?.initData;
  if (init) headers["X-Telegram-Init-Data"] = init;
  const dev = devTelegramId();
  if (dev) headers["X-Dev-Telegram-Id"] = dev;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const r = await fetch(path, { method: opts.method || (body ? "POST" : "GET"), headers, body, cache: "no-store" });
  let data: any;
  try {
    data = await r.json();
  } catch {
    data = { ok: false, message: "Xatolik · Ошибка" };
  }
  if (!r.ok || data.ok === false) {
    const err = new ApiError(data.message || "Error");
    err.code = data.code;
    err.errors = data.errors || [];
    err.status = r.status;
    throw err;
  }
  return data as T;
}
