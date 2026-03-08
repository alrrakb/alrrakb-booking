import BookingForm from "@/components/booking-form";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-cairo bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 md:px-12 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">احجز معنا</h1>
          <div className="flex items-center gap-2">
            {/* White logo placeholder */}
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-sm">TR</span>
            </div>
            <span className="font-semibold hidden sm:inline-block">طلائع الركب</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col pb-20">

        {/* Hero Section */}
        <section className="text-center mb-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-secondary mb-4 leading-tight">
            مرحباً بك في بوابة الحجز السريع
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed font-medium">
            نسعد باتمام حجزك معنا، فضلاً املأ البيانات التالية لنتمكن من إتمام حجزك في أسرع وقت حسب طلبك
          </p>
        </section>

        {/* Booking Form Layout */}
        <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl shadow-primary/5 border border-slate-100 p-6 md:p-8 relative overflow-hidden">
          {/* Decorative glassmorphism blob */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mt-20 w-48 h-48 rounded-full bg-secondary/5 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <BookingForm />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-secondary text-white py-8 mt-auto box-border">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm/relaxed text-white/80">
          <p>© 2025 مؤسسة طلائع الركب للتسويق الالكتروني.</p>
          <p>جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
