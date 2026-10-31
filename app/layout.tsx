import type { Metadata, Viewport } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { setupBlocked, setupProblems } from "@/lib/setup";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://aisns.vercel.app";
const DESC = "매일 쓰는 AI는 나를 어떻게 보고 있을까? Ask your AI one question and get a portrait of your mind. No account needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Unlabeled · 내 AI가 본 나",
  description: DESC,
  openGraph: { title: "Unlabeled · 내 AI가 본 나", description: DESC, siteName: "Unlabeled", type: "website", locale: "ko_KR", alternateLocale: ["en_US"], url: SITE },
  twitter: { card: "summary_large_image", title: "Unlabeled · How does your AI see you?", description: DESC },
  appleWebApp: { capable: true, title: "Unlabeled", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#151A2E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const problems = setupBlocked() ? setupProblems() : [];
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@800&family=IBM+Plex+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <div className="app">{problems.length ? <SetupNotice problems={problems} /> : children}</div>
      </body>
    </html>
  );
}
