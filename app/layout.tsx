import type { Metadata, Viewport } from "next";
import { SetupNotice } from "@/components/SetupNotice";
import { setupBlocked, setupProblems } from "@/lib/setup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unlabeled",
  description: "Talk to anyone on Earth in your own language. No labels until you both say so.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
