import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POSTLAIN — Store Manager",
  description: "High-end inventory & display management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${montserrat.variable} font-sans bg-bg-base text-text-primary antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
