import type { Metadata, Viewport } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { setupBlocked, setupProblems } from "@/lib/setup";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://aisns.vercel.app";
const TITLE = "Unlabeled · What does your AI think of you?";
const DESC = "I talk to my AI more than my family. What does it think of me? Ask it one question and get a portrait of your mind in 30 seconds. No account needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, siteName: "Unlabeled", type: "website", locale: "en_US", alternateLocale: ["ko_KR"], url: SITE },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  appleWebApp: { capable: true, title: "Unlabeled", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F7F6F2" }, { media: "(prefers-color-scheme: dark)", color: "#0B0D18" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const problems = setupBlocked() ? setupProblems() : [];
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="app">{problems.length ? <SetupNotice problems={problems} /> : children}</div>
      </body>
    </html>
  );
}
