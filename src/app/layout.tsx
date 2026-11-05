import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { AppProvider } from "@/components/app";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karyera Maktabi",
  description: "Bitiruvchilar uchun vakansiyalar, AI bilan CV va karyera mentorlari",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#194294" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") || undefined; // set per request by src/middleware.ts (CSP)
  // Without BACKEND_URL the app runs as a self-contained demo: /api/miniapp/* is answered in the browser
  // from public/demo (fictional vacancies and mentors; the user's actions stay in localStorage).
  const demo = !process.env.BACKEND_URL;
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" nonce={nonce} />
        {demo && <Script src="/demo/demo.js" strategy="beforeInteractive" nonce={nonce} />}
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
