"use client";

import Image from "next/image";
import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        }>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    );
}

function AdminLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    const handleLogout = () => {
        document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push("/admin/login");
    };

    return (
        <div className="min-h-screen flex flex-col font-cairo bg-slate-950 relative overflow-x-hidden dark" dir="rtl">
            {/* Background Layer — Fixed and behind everything */}
            <div className="fixed inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-80 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/bg1.jpg')" }}
                />
                {/* Darkened Overlay — Covers full viewport always */}
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
            </div>

            {/* Admin Navbar — Glassy, matches premium feel */}
            <nav className="bg-white/10 backdrop-blur-md border-b border-white/10 py-3 px-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between font-cairo">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-white/20 shadow-sm flex items-center justify-center bg-white/10 backdrop-blur-sm flex-shrink-0">
                            <Image
                                src="/logo.png"
                                alt="طلائع الركب"
                                width={44}
                                height={44}
                                className="object-contain w-full h-full"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">لوحة تحكم طلائع الركب</h1>
                            <p className="text-xs text-white/50">إدارة الحجوزات</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 text-xs sm:text-sm font-medium border border-red-500/20"
                        >
                            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                            <span className="hidden sm:inline">خروج</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Admin Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative">
                {children}
            </main>

            <footer className="text-center py-8 text-sm text-white/40 border-t border-white/10 mt-auto relative z-10 bg-black/20 backdrop-blur-sm">
                <p>© 2025 مؤسسة طلائع الركب للتسويق الالكتروني.</p>
            </footer>
        </div>
    );
}
