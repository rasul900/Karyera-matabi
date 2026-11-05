/* Karyera Maktabi — standalone demo of the Mini App (no server).
   Answers the app's /api/miniapp/* requests in the browser: vacancies and mentors come from data.js, the user's
   own actions (CV, skills, applications, bookings, mentor profile) are kept in localStorage on this device.
   The real Mini App talks to the Python backend instead; nothing here is sent anywhere. */
(() => {
  "use strict";
  const D = window.KM_DEMO;
  const KEY = "km_demo_state_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const S = Object.assign({ skills: [], docs: [], field: {}, apps: [], favs: [], bookings: [], mentee: {}, mentor: null,
    availability: { rules: [], days_off: [] }, lang: null, seq: 100, entries: [], ext: [], cvs: [] }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };
  const nextId = () => ++S.seq;
  const tgUser = () => { try { return window.Telegram.WebApp.initDataUnsafe.user || null; } catch (e) { return null; } };

  // ---------------------------------------------------------------- skills from text (rules, like the server)
  const W = "[\\p{L}\\p{N}_]";
  const toJs = (re) => re.replace(/\\w/g, W).replace(/\\b/g, `(?:(?<!${W})(?=${W})|(?<=${W})(?!${W}))`);
  const CATALOG = D.catalog.map((c) => { try { return { ...c, rx: new RegExp(toJs(c.re), "iu") }; } catch (e) { return null; } }).filter(Boolean);
  const sentences = (t) => t.split(/(?<=[.!?…])\s+|\n+/u).map((s) => s.trim()).filter((s) => s.length > 3);
  function extract(text) {
    const out = [];
    for (const s of sentences(text)) for (const c of CATALOG) {
      if (!out.find((x) => x.name === c.name) && c.rx.test(s)) out.push({ name: c.name, kind: c.kind, category: c.category, names: c.names, evidence: s });
    }
    return out;
  }
  const FIELD = { it: /dastur|программ|develop|python|java|frontend|backend|\bit\b|qa\b|devops|data/i, finance: /moliya|финанс|бухгал|buxgalter|audit|bank|банк|iqtisod/i,
    marketing: /marketing|маркетинг|smm|контент|kontent|brand|бренд|реклам/i, law: /huquq|юрист|юрид|law|legal|advokat/i,
    education: /o'qituvchi|ustoz|учител|преподав|teacher|ta'lim|образован|tutor/i, engineering: /muhandis|инженер|engineer|qurilish|mexanik/i,
    design: /dizayn|дизайн|design|figma|ui|ux|grafik/i, sales: /savdo|продаж|sales|menejer|mijoz|клиент|operator/i };
  const guess = (t) => { let best = null, n = 0; for (const [k, re] of Object.entries(FIELD)) { const m = (t.match(new RegExp(re, "gi")) || []).length; if (m > n) { n = m; best = k; } } return best; };
  const skill = (name) => S.skills.find((s) => s.name === name && s.status !== "removed");

  // ---------------------------------------------------------------- matching (same credits as the server)
  function reqs(vid) {
    const m = D.vacancy[vid].match;
    return [...m.matched, ...m.partial, ...m.missing].map((r) => ({ name: r.name, weight: r.weight || 1 }));
  }
  function match(vid) { return matchReqs(reqs(vid)); }
  function matchReqs(list) {
    const matched = [], partial = [], missing = [];
    let total = 0, got = 0;
    for (const r of list) {
      total += r.weight;
      const s = skill(r.name);
      if (s && s.status === "confirmed") { got += r.weight; matched.push({ name: r.name, weight: r.weight, evidence: s.evidence }); }
      else if (s) { got += r.weight * 0.5; partial.push({ name: r.name, weight: r.weight, reason: "unconfirmed", evidence: s.evidence }); }
      else missing.push({ name: r.name, weight: r.weight });
    }
    const recommendations = [...partial.map((p) => ({ code: "confirm", name: p.name })), ...missing.map((x) => ({ code: "add_fact", name: x.name }))].slice(0, 8);
    return { percent: total ? Math.round((100 * got) / total) : 0, matched, partial, missing, recommendations,
      emphasis: matched.slice(0, 6).map((x) => x.name), method: ["method_weights", "method_credit", "method_limits"] };
  }
  function vacList(q = {}) {
    const own = S.field.profession;
    return D.vacancies.map((v) => {
      const m = match(v.id);
      const same = !!own && v.profession === own;
      return { ...v, percent: m.percent, score: m.percent + (same ? 15 : 0), same_field: same, is_favorite: S.favs.includes(v.id),
        matched: m.matched.map((x) => x.name), partial: m.partial.map((x) => x.name), missing: m.missing.map((x) => x.name) };
    }).filter((v) => (!q.profession || v.profession === q.profession) && (!q.fav || v.is_favorite) &&
      (!q.q || (v.title + " " + v.company_name + " " + (v.skills || []).join(" ")).toLowerCase().includes(q.q.toLowerCase())))
      .sort((a, b) => b.score - a.score || b.id - a.id);
  }

  // ---------------------------------------------------------------- mentor slots in the mentor's time zone
  function tzOffsetMin(tz, date) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(date).map((x) => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - date.getTime()) / 60000;
  }
  const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  function slots(mid, exclude) {
    const m = mid === "own" ? S.mentor : D.mentor[mid].mentor;
    const rules = mid === "own" ? S.availability.rules : m.availability.rules;
    const off = new Set(mid === "own" ? S.availability.days_off : m.availability.days_off);
    const tz = m.timezone || "Asia/Tashkent", dur = +m.duration || 60, now = Date.now();
    const busy = S.bookings.filter((b) => String(b.mentor_id) === String(mid) && ["pending", "confirmed"].includes(b.status) && b.id !== exclude)
      .map((b) => [Date.parse(b.start_iso), Date.parse(b.end_iso)]);
    const out = [];
    for (let k = 0; k <= 21; k++) {
      const local = new Date(now + tzOffsetMin(tz, new Date(now)) * 60000 + k * 86400000);
      const y = local.getUTCFullYear(), mo = local.getUTCMonth(), d = local.getUTCDate();
      const key = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (off.has(key)) continue;
      const wd = (new Date(Date.UTC(y, mo, d)).getUTCDay() + 6) % 7;
      for (const r of rules.filter((r) => +r.weekday === wd)) {
        const [ah, am] = r.start.split(":").map(Number), [bh, bm] = r.end.split(":").map(Number);
        for (let t = ah * 60 + am; t + dur <= bh * 60 + bm; t += dur) {
          const guessUtc = Date.UTC(y, mo, d, Math.floor(t / 60), t % 60);
          const start = guessUtc - tzOffsetMin(tz, new Date(guessUtc)) * 60000, end = start + dur * 60000;
          if (start < now + 2 * 3600000 || busy.some(([s, e]) => s < end && start < e)) continue;
          out.push(iso(new Date(start)));
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- bookings (the demo mentor confirms after ~10 s)
  function tickBookings() {
    let changed = false;
    for (const b of S.bookings) if (b.status === "pending" && Date.now() - b.created > 10000) {
      b.status = "confirmed"; b.mentor.meeting_link = "https://meet.google.com/demo"; changed = true;
    }
    if (changed) save();
  }
  function view(b) {
    const start = Date.parse(b.start_iso), now = Date.now();
    return { ...b, can_change: ["pending", "confirmed"].includes(b.status) && start > now, free_change: start - now >= 86400000,
      can_complete: b.status === "confirmed" && Date.parse(b.end_iso) <= now };
  }


  // ---------------------------------------------------------------- career agent (experience base, CVs, tracker)
  const nowSql = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const autoTitle = (t) => { const f = sentences(t)[0] || t; return f.length <= 70 ? f : f.slice(0, 69) + "…"; };
  function addEntry(text, title, source = "text") {
    const e = { id: nextId(), title: (title || "").trim() || autoTitle(text), text, source, role: "", period: "", kind: null,
      created_at: nowSql(), addenda: [] };
    S.entries.unshift(e);
    for (const f of extract(text)) {
      if (!S.skills.find((x) => x.name === f.name)) S.skills.push({ id: nextId(), status: "suggested", confidence: "medium", entry_id: e.id, ...f });
    }
    return e;
  }
  const entrySkills = (id) => S.skills.filter((x) => x.entry_id === id && x.status !== "removed");
  function analyzeVacancy(text) {
    const stats = {};
    for (const sn of sentences(text)) for (const c of CATALOG) if (c.rx.test(sn)) (stats[c.name] ||= { n: 0, evidence: sn }).n++;
    const reqs = Object.entries(stats).map(([name, st]) => ({ name, weight: Math.min(3, st.n), evidence: st.evidence }))
      .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
    const level = /senior|lead|руководител|старш/i.test(text) ? "senior" : /middle|опыт от 3/i.test(text) ? "middle"
      : /junior|стажёр|стажер|intern|без опыта|tajribasiz/i.test(text) ? "junior" : null;
    const first = (text.split(/\n/).map((l) => l.trim()).find(Boolean) || "—").replace(/^(вакансия|vacancy|lavozim)\s*[:\-—]\s*/i, "");
    return { title: first.slice(0, 100), level, requirements: reqs };
  }
  function tracker() {
    const counts = { found: 0, analyzing: 0, cv_generated: 0, ready: 0, applied: 0, interview: 0, rejected: 0, offer: 0 };
    let applied = 0, interviews = 0, offers = 0;
    const perc = [];
    for (const v of S.ext) {
      counts[v.status]++; perc.push(matchReqs(v.requirements).percent);
      if (["applied", "interview", "rejected", "offer"].includes(v.status)) applied++;
      if (v.reached_interview) interviews++;
      if (v.status === "offer") offers++;
    }
    const map = { sent: "applied", viewed: "applied", interview: "interview", rejected: "rejected", offer: "offer" };
    for (const a of S.apps) { counts[map[a.status]]++; applied++; if (["interview", "offer"].includes(a.status)) interviews++; if (a.status === "offer") offers++; }
    return { counts, found: S.ext.length + S.apps.length, applied, interviews, offers,
      avg_match: perc.length ? Math.round(perc.reduce((a, b) => a + b, 0) / perc.length) : null,
      to_interview: applied ? Math.round((100 * interviews) / applied) : null, to_offer: applied ? Math.round((100 * offers) / applied) : null,
      external: S.ext.length, platform: S.apps.length };
  }
  const skillLabel = (name, lang) => { const c = CATALOG.find((x) => x.name === name); return (c && c.names[lang]) || name; };
  function buildCv(vid, lang) {
    lang = ["uz", "ru", "en"].includes(lang) ? lang : "ru";
    const v = S.ext.find((x) => x.id === vid); if (!v) err(404, "not_found", "Vakansiya topilmadi");
    const confirmed = S.skills.filter((x) => x.status === "confirmed");
    if (!confirmed.length) err(400, "no_facts", "Avval ko'nikmalarni tasdiqlang");
    const want = Object.fromEntries(v.requirements.map((r) => [r.name, r.weight]));
    const ordered = [...confirmed].sort((a, b) => (want[b.name] || 0) - (want[a.name] || 0) || (a.kind !== "hard") - (b.kind !== "hard"));
    const h = D.cv_headings[lang], me0 = me(), p = me0.profile;
    const byEntry = {};
    for (const x of ordered) (byEntry[x.entry_id] ||= []).push(x);
    const experience = Object.entries(byEntry).map(([eid, list]) => {
      const e = S.entries.find((y) => y.id === +eid) || { title: "—", role: "", period: "" };
      const facts = {};
      for (const x of list) (facts[x.evidence] ||= { text: x.evidence, skills: [] }).skills.push(skillLabel(x.name, lang));
      return { entry_id: +eid, title: e.title, role: e.role, period: e.period, facts: Object.values(facts).slice(0, 4),
        relevance: list.reduce((a, x) => a + (want[x.name] || 0), 0) };
    }).sort((a, b) => b.relevance - a.relevance);
    const top = ordered.slice(0, 6).map((x) => skillLabel(x.name, lang)).join(", ");
    const edu = [p.university, p.specialty, p.grad_year].filter(Boolean).join(", ");
    const content = { lang, name: me0.user.name, target: { title: v.title, company: v.company || "" }, headings: h,
      summary: [edu ? h.sum_edu.replace("{edu}", edu) : "", h.sum_skills.replace("{title}", v.title).replace("{skills}", top)].filter(Boolean).join(" "),
      education: { university: p.university, specialty: p.specialty, grad_year: p.grad_year, city: p.city },
      skills: { hard: ordered.filter((x) => x.kind === "hard").map((x) => skillLabel(x.name, lang)), soft: ordered.filter((x) => x.kind === "soft").map((x) => skillLabel(x.name, lang)) },
      experience: experience.slice(0, 6), achievements: S.entries.flatMap((e) => sentences(e.text).filter((sn) => /\d/.test(sn))).slice(0, 5),
      keywords: ordered.filter((x) => want[x.name]).map((x) => skillLabel(x.name, lang)), generated_by_ai: true };
    const cv = { id: nextId(), target_kind: "external", target_id: vid, lang, content, cover_letter: null, created_at: nowSql() };
    S.cvs.unshift(cv);
    if (["found", "analyzing"].includes(v.status)) v.status = "cv_generated";
    return cv;
  }
  const LETTER = {
    uz: ["Assalomu alaykum!", "«{title}» lavozimiga ariza yuboraman. Mening tajribam {reqs} talablariga mos keladi:", "Hurmat bilan, {name}"],
    ru: ["Здравствуйте!", "Откликаюсь на вакансию «{title}». Мой опыт подходит под требования: {reqs}:", "С уважением, {name}"],
    en: ["Dear Hiring Manager,", "I am applying for the «{title}» position. My experience matches your requirements in {reqs}:", "Best regards, {name}"],
  };
  function buildLetter(cv) {
    const v = S.ext.find((x) => x.id === cv.target_id), m = matchReqs(v ? v.requirements : []);
    if (!m.matched.length) err(400, "no_match", "Vakansiya talablariga mos tasdiqlangan faktlar yo'q");
    const L = LETTER[cv.lang] || LETTER.ru, reqs = m.matched.slice(0, 3).map((x) => skillLabel(x.name, cv.lang)).join(", ");
    const lines = m.matched.slice(0, 3).map((x) => `— ${skillLabel(x.name, cv.lang)}: ${x.evidence.replace(/\.$/, "")}.`);
    return [L[0], L[1].replace("{title}", cv.content.target.title).replace("{reqs}", reqs), ...lines, "", L[2].replace("{name}", cv.content.name)].join("\n");
  }
  const careerSkill = (x) => ({ id: x.id, name: x.name, kind: x.kind, category: x.category, evidence: x.evidence, status: x.status,
    assumption: false, names: x.names });

  // ---------------------------------------------------------------- routes
  const ok = (data = {}) => ({ ok: true, ...data });
  const err = (status, code, message) => { const e = new Error(message); e.status = status; e.code = code; throw e; };
  const me = () => {
    const base = JSON.parse(JSON.stringify(D.me));
    const u = tgUser();
    if (u) base.user.name = [u.first_name, u.last_name].filter(Boolean).join(" ");
    else base.user.name = "Aziza";
    base.lang = S.lang || (u && (u.language_code || "").startsWith("ru") ? "ru" : base.lang);
    base.has_cv = S.docs.length > 0;
    base.mentor = S.mentor ? { id: "own", status: "verified" } : null;
    base.profile = { ...base.profile, ...S.field };
    base.ai_available = false;
    return base;
  };

  async function route(method, path, query, body) {
    tickBookings();
    let m;
    if (path === "/me") return me();
    if (path === "/lang") { S.lang = body.lang; save(); return ok(); }
    if (path === "/cv" && method === "POST") {
      const role = (body.get("desired_role") || "").trim(), prof = body.get("profession") || "";
      let text = (body.get("text") || "").trim();
      const file = body.get("file");
      if (file && file.size) {
        if (!/\.(txt|md)$/i.test(file.name)) err(400, "demo", "Demo versiyada PDF/DOCX o'qilmaydi — «Matn» bo'limiga CV matnini qo'ying · В демо читается только текст: вставьте его во вкладке «Текст»");
        text = (await file.text()).trim();
      }
      if (!role && !prof) err(400, "no_field", "Sohangizni kiriting yoki tanlang");
      if (text.length < 40) err(400, "too_short", "CV juda qisqa: tajriba, ta'lim va loyihalar haqida batafsilroq yozing");
      S.field = { profession: prof || guess(role) || guess(text), desired_role: role || null };
      S.docs.push({ id: nextId(), filename: file && file.size ? file.name : "CV (matn).txt", size: text.length, created_at: new Date().toISOString() });
      const entry = addEntry(text, file && file.size ? file.name : "CV", "document");
      const found = [];
      for (const f of extract(text)) {
        let s = S.skills.find((x) => x.name === f.name);
        if (!s) { s = { id: nextId(), status: "suggested", confidence: "medium", entry_id: entry.id, ...f }; S.skills.push(s); }
        else if (s.status === "suggested") s.evidence = f.evidence;
        if (s.status !== "removed") found.push(s);
      }
      const email = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/), phone = text.match(/(?:\+?998[\s\-()]*)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/),
        li = text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[\w\-%.]+\/?/i);
      const contacts = { email: email && email[0], phone: phone && phone[0], linkedin: li && li[0], education: null };
      for (const k of ["email", "phone", "linkedin"]) if (contacts[k] && !S.mentee[k]) S.mentee[k] = contacts[k];
      save();
      return ok({ analyzer: "rules", entries: 1, dropped: 0, skills: found, contacts, field: S.field, matches: vacList().slice(0, 20) });
    }
    if (path === "/cv") return ok({ field: S.field, documents: S.docs, skills: S.skills.filter((s) => s.status !== "removed"), mentee: S.mentee });
    if ((m = path.match(/^\/skills\/(\d+)$/))) { const s = S.skills.find((x) => x.id === +m[1]); if (s) s.status = body.status; save(); return ok(); }
    if (path === "/skills-confirm-all") { let n = 0; for (const s of S.skills) if (s.status === "suggested") { s.status = "confirmed"; n++; } save(); return ok({ confirmed: n }); }
    if (path === "/vacancies") return ok({ items: vacList(query), verified: true });
    if ((m = path.match(/^\/vacancies\/(\d+)$/))) {
      const d = D.vacancy[m[1]]; if (!d) err(404, "not_found", "Vakansiya topilmadi");
      const a = S.apps.find((x) => x.vacancy_id === +m[1]);
      return ok({ ...d, match: match(m[1]), applied: a ? a.status : null, favorite: S.favs.includes(+m[1]), verified: true });
    }
    if ((m = path.match(/^\/vacancies\/(\d+)\/favorite$/))) {
      const id = +m[1], on = !S.favs.includes(id); S.favs = on ? [...S.favs, id] : S.favs.filter((x) => x !== id); save(); return ok({ favorite: on });
    }
    if ((m = path.match(/^\/vacancies\/(\d+)\/resume$/))) {
      const v = D.vacancy[m[1]].vacancy, want = new Set((v.skills || []).map((s) => s.toLowerCase()));
      const conf = S.skills.filter((s) => s.status === "confirmed");
      const exp = {};
      for (const s of conf) (exp[s.evidence] ||= { text: s.evidence, skills: [] }).skills.push(s.name);
      const p = me().profile;
      return ok({ resume: { name: me().user.name, education: { university: p.university, specialty: p.specialty, grad_year: p.grad_year },
        experience: Object.values(exp), skills: conf.map((s) => ({ name: s.name, matched: want.has(s.name.toLowerCase()) })),
        warnings: conf.length ? [] : ["Avval CV yuboring va ko'nikmalarni tasdiqlang"], generated_by_ai: true } });
    }
    if ((m = path.match(/^\/vacancies\/(\d+)\/apply$/))) {
      if (!S.skills.some((s) => s.status === "confirmed")) err(400, "no_resume", "Avval kamida bitta ko'nikmani tasdiqlang");
      const v = D.vacancy[m[1]].vacancy;
      if (!S.apps.find((a) => a.vacancy_id === v.id)) S.apps.unshift({ id: nextId(), vacancy_id: v.id, title: v.title, company_name: v.company_name,
        status: "sent", created_at: new Date().toISOString().slice(0, 19).replace("T", " ") });
      save(); return ok({ application_id: S.apps[0].id });
    }
    if (path === "/applications") return ok({ items: S.apps });
    if (path === "/mentors") {
      const items = D.mentors.map((x) => ({ ...x, next_slot: slots(x.id)[0] || null })).filter((x) =>
        (!query.category || x.specializations.includes(query.category)) && (!query.language || x.languages.includes(query.language)) &&
        (!query.price || (query.price === "free") === x.is_free) && (!query.fmt || [query.fmt, "both"].includes(x.format)) &&
        (!query.q || (x.full_name + " " + x.title + " " + (x.company || "")).toLowerCase().includes(query.q.toLowerCase())));
      if (query.sort === "price") items.sort((a, b) => (a.currency !== "UZS") - (b.currency !== "UZS") || a.price - b.price);
      if (query.sort === "rating") items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return ok({ items });
    }
    if ((m = path.match(/^\/mentors\/(\d+)\/slots$/))) return ok({ slots: slots(m[1], +query.exclude || null) });
    if ((m = path.match(/^\/mentors\/(\d+)$/))) {
      const d = D.mentor[m[1]]; if (!d) err(404, "not_found", "Mentor topilmadi");
      return ok({ ...d, slots: slots(m[1]), mentee: { ...d.mentee, ...S.mentee }, own: false });
    }
    if (path === "/mentee-profile") { if (method === "POST") Object.assign(S.mentee, body); save(); return ok({ profile: S.mentee }); }
    if (path === "/bookings" && method === "POST") {
      const d = D.mentor[body.mentor_id]; if (!d) err(404, "not_found", "Mentor topilmadi");
      if (!slots(body.mentor_id).includes(body.start)) err(409, "slot_taken", "Bu vaqt band. Boshqa vaqtni tanlang");
      if (!(body.answers || {}).topic) err(400, "invalid", "Qaysi savolni muhokama qilmoqchisiz?");
      if (body.profile) Object.assign(S.mentee, body.profile);
      const mm = d.mentor, start = Date.parse(body.start);
      const b = { id: nextId(), mentor_id: mm.id, status: "pending", price: mm.price, currency: mm.currency, payment_status: mm.price ? "awaiting" : "free",
        start_iso: body.start, end_iso: iso(new Date(start + mm.duration * 60000)), answers: body.answers, created: Date.now(), review: null,
        late_cancel: 0, mentee_notes: null, mentor: { id: mm.id, full_name: mm.full_name, title: mm.title, company: mm.company, photo_url: mm.photo_url } };
      S.bookings.unshift(b); save(); return ok({ booking: view(b) });
    }
    if (path === "/bookings") return ok({ items: S.bookings.map(view) });
    if ((m = path.match(/^\/bookings\/(\d+)\/(\w+)$/))) {
      const b = S.bookings.find((x) => x.id === +m[1]); if (!b) err(404, "not_found", "Topilmadi");
      if (m[2] === "cancel") { b.late_cancel = view(b).free_change ? 0 : 1; b.status = "cancelled"; }
      if (m[2] === "reschedule") {
        if (!slots(b.mentor_id, b.id).includes(body.start)) err(409, "slot_taken", "Bu vaqt band");
        const dur = Date.parse(b.end_iso) - Date.parse(b.start_iso);
        b.start_iso = body.start; b.end_iso = iso(new Date(Date.parse(body.start) + dur)); b.status = "pending"; b.created = Date.now();
      }
      if (m[2] === "complete") { b.status = "completed"; if (body.rating) b.review = { rating: body.rating, text: body.text }; if (body.notes) b.mentee_notes = body.notes; }
      save(); return ok({ booking: view(b) });
    }
    if (path === "/mentor" && method === "POST") {
      if (!body.full_name || !body.title || !body.bio || !(body.specializations || []).length || !(body.languages || []).length)
        err(400, "invalid", "Majburiy maydonlarni to'ldiring: ism, lavozim, bio, yo'nalish va til");
      const cats = D.me.dicts.categories;
      S.mentor = { ...body, id: "own", status: "verified", sessions: 0, rating: null, reviews: 0, price: +body.price || 0, duration: +body.duration || 60,
        years: +body.years || 0, specialization_labels: body.specializations.map((k) => (cats[k] || {})[S.lang || "uz"] || k) };
      save(); return ok({ mentor: S.mentor });
    }
    if (path === "/mentor") return ok(S.mentor ? { mentor: S.mentor, availability: S.availability, earnings: {}, commission_pct: 0,
      bookings: { pending: [], confirmed: [], completed: [], rejected: [], cancelled: [] } } : { mentor: null });
    if (path === "/mentor/availability") { S.availability = { rules: body.rules || [], days_off: body.days_off || [] }; save(); return ok({ availability: S.availability }); }
    if (path === "/career") {
      const conf = S.skills.filter((x) => x.status === "confirmed"), pend = S.skills.filter((x) => x.status === "suggested");
      const cats = new Set(conf.map((x) => x.category));
      return ok({ counts: { entries: S.entries.length, confirmed: conf.length, pending: pend.length },
        experience_types: D.management_types.filter((c) => cats.has(c)), confirmed: conf.map(careerSkill), pending: pend.map(careerSkill),
        achievements: S.entries.flatMap((e) => sentences(e.text).filter((sn) => /\d/.test(sn)).map((sentence) => ({ sentence, entry_id: e.id }))).slice(0, 8),
        timeline: S.entries.map((e) => ({ id: e.id, title: e.title, period: e.period, role: e.role, source: e.source })), tracker: tracker() });
    }
    if (path === "/career/entries" && method === "POST") {
      if ((body.text || "").trim().length < 10) err(400, "too_short", "Bir-ikki gap yozing: nima qildingiz?");
      const e = addEntry(body.text.trim(), body.title); save();
      return ok({ id: e.id, skills: entrySkills(e.id) });
    }
    if (path === "/career/entries") return ok({ items: S.entries.map((e) => ({ ...e, n_skills: entrySkills(e.id).length })), total: S.entries.length });
    if ((m = path.match(/^\/career\/entries\/(\d+)(?:\/(\w+))?$/))) {
      const e = S.entries.find((x) => x.id === +m[1]); if (!e) err(404, "not_found", "Yozuv topilmadi");
      if (m[2] === "field") { if (["role", "period", "title"].includes(body.field)) e[body.field] = (body.value || "").slice(0, 120); save(); return ok(); }
      if (m[2] === "addendum") {
        if ((body.text || "").trim().length < 3) err(400, "too_short", "Matn juda qisqa");
        e.addenda.push({ id: nextId(), text: body.text.trim() });
        for (const f of extract(body.text)) if (!S.skills.find((x) => x.name === f.name)) S.skills.push({ id: nextId(), status: "suggested", confidence: "medium", entry_id: e.id, ...f });
        save(); return ok();
      }
      if (m[2] === "delete") { S.entries = S.entries.filter((x) => x.id !== e.id); S.skills = S.skills.filter((x) => x.entry_id !== e.id || x.status === "confirmed"); save(); return ok(); }
      return ok({ entry: e, addenda: e.addenda, skills: entrySkills(e.id), followups: [] });
    }
    if (path === "/career/vacancies" && method === "POST") {
      const text = (body.text || "").trim();
      if (text.length < 40) err(400, body.url ? "demo" : "too_short", body.url ? "Demo versiyada havola o'qilmaydi — vakansiya matnini qo'ying" : "Vakansiya matni juda qisqa: to'liq qo'ying");
      const a = analyzeVacancy(text);
      const v = { id: nextId(), title: body.title || a.title, company: body.company || null, url: body.url || null, level: a.level, text,
        requirements: a.requirements, status: "analyzing", created_at: nowSql(), applied_at: null, reached_interview: 0 };
      S.ext.unshift(v); save(); return ok({ id: v.id });
    }
    if (path === "/career/vacancies") return ok({ items: S.ext.map((v) => ({ ...v, match_percent: matchReqs(v.requirements).percent })) });
    if ((m = path.match(/^\/career\/vacancies\/(\d+)(?:\/(\w+))?$/))) {
      const v = S.ext.find((x) => x.id === +m[1]); if (!v) err(404, "not_found", "Vakansiya topilmadi");
      if (m[2] === "status") { v.status = body.status; if (["interview", "offer"].includes(body.status)) v.reached_interview = 1; save(); return ok(); }
      if (m[2] === "delete") { S.ext = S.ext.filter((x) => x.id !== v.id); S.cvs = S.cvs.filter((x) => x.target_id !== v.id); save(); return ok(); }
      const mt = matchReqs(v.requirements);
      return ok({ vacancy: { ...v, match_percent: mt.percent, terms: [] }, text: v.text, match: mt,
        versions: S.cvs.filter((x) => x.target_id === v.id).map((x) => ({ id: x.id, lang: x.lang, created_at: x.created_at, has_letter: !!x.cover_letter })) });
    }
    if (path === "/career/cv" && method === "POST") { const cv = buildCv(+body.target_id, body.lang); save(); return ok({ id: cv.id, content: cv.content }); }
    if ((m = path.match(/^\/career\/cv\/(\d+)(?:\/(\w+))?$/))) {
      const cv = S.cvs.find((x) => x.id === +m[1]); if (!cv) err(404, "not_found", "Versiya topilmadi");
      if (m[2] === "letter") { cv.cover_letter = body && body.text ? body.text : buildLetter(cv); save(); return ok({ cover_letter: cv.cover_letter }); }
      if (m[2] === "link") err(400, "demo", "Demo versiyada fayl yuklab olinmaydi");
      return ok(cv);
    }
    err(404, "not_found", "Demo: bu amal mavjud emas");
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.startsWith("/api/miniapp")) return realFetch(input, init);
    let body = init.body;
    if (typeof body === "string") try { body = JSON.parse(body); } catch (e) { /* form */ }
    const path = url.pathname.replace("/api/miniapp", "") || "/";
    const query = Object.fromEntries(url.searchParams);
    await new Promise((r) => setTimeout(r, path === "/cv" ? 900 : 150)); // feels like a network, shows the animations
    try {
      const data = await route((init.method || "GET").toUpperCase(), path, query, body || {});
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, code: e.code || "error", message: e.message, errors: [] }),
        { status: e.status || 500, headers: { "Content-Type": "application/json" } });
    }
  };
})();
