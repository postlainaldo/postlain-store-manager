import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0c1a2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "POSTLAIN — Store Manager",
  description: "Hệ thống quản lý cửa hàng POSTLAIN",
  applicationName: "POSTLAIN",
  icons: {
    // PNG only — Apple ignores SVG
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png",  sizes: "192x192", type: "image/png" },
    ],
    apple: [
      // Apple touch icon must be PNG, no SVG
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POSTLAIN",
  },
  formatDetection: { telephone: false },
  other: {
    // Force browsers to pick up new SW / manifest on each deploy
    "cache-control": "no-cache",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Apple PWA — must be plain PNG link tags, metadata API alone is not enough */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS splash screens — each major device size */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1290x2796.png" />
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1179x2556.png" />
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1170x2532.png" />
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1125x2436.png" />
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/splash-828x1792.png" />
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/splash-750x1334.png" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="POSTLAIN" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
