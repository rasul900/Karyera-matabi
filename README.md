# Karyera Maktabi — Telegram Mini App

Bitiruvchilar uchun Telegram Mini App (Next.js 15, React 19, TypeScript):

- **CV** — fayl yoki matn + soha → AI ko'nikmalarni ajratadi va mos vakansiyalarni darhol ko'rsatadi
- **Vakansiyalar** — moslik foizi, nima yetishmasligi, 1 klikda ariza
- **Mentorlar** — katalog, filtrlar, Calendly kabi kun va vaqt tanlab bron qilish
- **Karyera agenti** — tajriba bazasi, kompetensiyalar xaritasi, boshqa saytlardagi vakansiyalarni tahlil qilish,
  har bir vakansiya uchun CV (uz/ru/en) va motivatsion xat, arizalar trekeri
- **Mentor kabineti** — ro'yxatdan o'tish, haftalik jadval, arizalar

Bot: [@karyeramaktabibot](https://t.me/karyeramaktabibot)

## Vercel'ga joylash

1. https://vercel.com/new → shu repo → **Import** → **Deploy**. Hech narsa sozlash shart emas.
2. Chiqqan `https://….vercel.app` manzilini botga ulang (BotFather → `/mybots` → Bot Settings → Menu Button).

### Ikki rejim

| Rejim | Qachon | Nima bo'ladi |
|---|---|---|
| **Demo** | `BACKEND_URL` berilmagan | Server kerak emas. 14 soha bo'yicha 41 ta vakansiya va mentorlar `public/demo/demo.js` da (to'qima, `demo-src/mock.js` + backend'dagi `scripts/build_demo.py`), foydalanuvchi amallari telefonda (localStorage) saqlanadi |
| **To'liq** | `BACKEND_URL=https://<python backend>` | `/api/*` so'rovlari Python backendga yo'naltiriladi: haqiqiy baza, botda ro'yxatdan o'tish tekshiruvi, bildirishnomalar |

Python backend (sayt, API, bot): https://github.com/rasul900/start-platform

## Lokal ishga tushirish

```bash
npm install
npm run dev
```

http://localhost:3000

## Xavfsizlik

- Har bir so'rov uchun CSP nonce (`src/middleware.ts`). Sahifani faqat Telegram ichida (`web.telegram.org`) ochish mumkin.
- To'liq rejimda foydalanuvchi faqat Telegram imzolagan `initData` orqali aniqlanadi. U serverda tekshiriladi.
- Kalitlar faqat `.env.local` ga yoki Vercel Environment Variables'ga yoziladi (`.gitignore` da).

## AI misoli (ixtiyoriy)

`index.ts` — Vercel AI Gateway orqali `moonshotai/kimi-k3`. `.env.local` ga `AI_GATEWAY_API_KEY=...` yozing, so'ng:

```bash
npm run ai:example
```

AI Gateway ishlashi uchun Vercel hisobida karta bo'lishi kerak.
