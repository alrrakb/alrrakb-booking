import type { Metadata } from "next";
import { Cairo, Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "احجز معنا | مؤسسة طلائع الركب",
  description: "نسعد باتمام حجزك معنا، فضلاً املأ البيانات التالية لنتمكن من إتمام حجزك في أسرع وقت حسب طلبك",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", geist.variable, cairo.variable)}>
      <body
        className={`antialiased font-cairo bg-slate-50 text-slate-900`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
