import BookingForm from "@/components/booking-form";
import BookingHeader from "@/components/booking-header";

import { Instagram, Twitter, Facebook } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-cairo bg-slate-950 relative overflow-x-hidden dark">
      {/* Background Layer — Fixed and behind everything */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-80 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/bg1.jpg')" }}
        />
        {/* Darkened Overlay — Covers full viewport always */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      </div>

      {/* Header */}
      <BookingHeader />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col pb-20 relative z-10">

        {/* Hero Section */}
        <section className="text-center mb-10 max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #4db8d4 0%, #ffffff 50%, #8b4fb8 100%)" }}
          >
            مرحباً بك في بوابة الحجز السريع
          </h2>
          <p className="text-lg text-white leading-relaxed font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            نسعد باتمام حجزك معنا، فضلاً املأ البيانات التالية لنتمكن من إتمام حجزك في أسرع وقت حسب طلبك
          </p>
        </section>

        {/* Booking Form Layout — Premium Ultra-Glassmorphism */}
        <div className="w-full max-w-3xl mx-auto bg-white/[0.03] backdrop-blur-3xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border border-white/20 p-6 md:p-10 relative overflow-hidden group hover:border-white/30 transition-all duration-500">
          {/* Subtle logo-colored glows inside the glass */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#4db8d4]/10 blur-[100px] pointer-events-none group-hover:bg-[#4db8d4]/15 transition-colors"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mt-20 w-64 h-64 rounded-full bg-[#8b4fb8]/10 blur-[80px] pointer-events-none group-hover:bg-[#8b4fb8]/15 transition-colors"></div>

          <div className="relative z-10">
            <BookingForm />
          </div>
        </div>

      </main>

      {/* Footer — Semi-Transparent Glassy */}
      <footer className="bg-black/40 backdrop-blur-md text-white py-12 mt-auto border-t border-white/10 z-10 relative">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Copyright Text - Left Side */}
          <div className="text-center md:text-right text-sm/relaxed text-white/60 order-1">
            <p className="font-bold text-white/80 select-none">مؤسسة طلائع الركب للتسويق الالكتروني</p>
            <p>© 2025 جميع الحقوق محفوظة.</p>
          </div>

          {/* Social Media Links - Right Side */}
          <div className="flex items-center gap-6 order-2">
            <a href="#" className="text-white/40 hover:text-[#4db8d4] transition-all hover:scale-110" aria-label="Instagram">
              <Instagram className="size-6" />
            </a>
            <a href="#" className="text-white/40 hover:text-[#4db8d4] transition-all hover:scale-110" aria-label="Twitter">
              <Twitter className="size-6" />
            </a>
            <a href="#" className="text-white/40 hover:text-[#4db8d4] transition-all hover:scale-110" aria-label="Facebook">
              <Facebook className="size-6" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
