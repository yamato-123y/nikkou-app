import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "現場日報",
  description: "株式会社大和の現場専用日報アプリ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "大和日報", statusBarStyle: "default" },
  icons: {
    icon: "/nippo.jpg",
    apple: "/nippo.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#EA580C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
