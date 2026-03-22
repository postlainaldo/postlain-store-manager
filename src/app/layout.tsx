import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POSTLAIN — Store Manager",
  description: "High-end inventory & display management system",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POSTLAIN",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="theme-color" content="#e0f2fe" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base text-text-primary">
            {/* Top navigation bar */}
            <TopNav />

            {/* Main content area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-bg-base">
              <div className="max-w-[1440px] mx-auto px-4 py-5 md:px-8 md:py-6 pb-20 md:pb-8">
                {children}
              </div>
            </main>
          </div>

          {/* Bottom nav — mobile only */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
