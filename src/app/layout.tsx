import type { Metadata } from "next";
import { Cairo, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "احجز معنا | مؤسسة طلائع الركب",
  description: "نسعد باتمام حجزك معنا، فضلاً املأ البيانات التالية لنتمكن من إتمام حجزك في أسرع وقت حسب طلبك",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", geist.variable)}>
      <body
        className={`antialiased font-cairo bg-slate-50 text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
