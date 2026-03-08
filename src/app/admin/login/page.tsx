"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("تم تسجيل الدخول بنجاح");
                router.push("/admin");
                router.refresh();
            } else {
                toast.error(data.error || "فشل تسجيل الدخول");
            }
        } catch {
            toast.error("حدث خطأ في الاتصال");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-cairo bg-slate-950 relative overflow-hidden dark" dir="rtl">
            {/* Background Layer — Matches main page */}
            <div className="fixed inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-80 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/bg1.jpg')" }}
                />
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
            </div>

            <div className="w-full max-w-sm bg-white/[0.03] backdrop-blur-3xl p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border border-white/20 relative z-10 mx-4">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border border-white/20 shadow-md flex items-center justify-center bg-white/10 backdrop-blur-sm">
                        <Image
                            src="/logo.png"
                            alt="طلائع الركب"
                            width={80}
                            height={80}
                            className="object-contain w-full h-full"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white">تسجيل دخول الإدارة</h1>
                    <p className="text-sm text-white/60 mt-2">نظام حجوزات طلائع الركب</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-white/80">البريد الإلكتروني</label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-white/[0.05] border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#8b4fb8] text-left"
                            dir="ltr"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-white/80">كلمة المرور</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/[0.05] border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#8b4fb8] text-left"
                            dir="ltr"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-md mt-6 font-bold text-white border-0 shadow-lg hover:opacity-90 transition-all rounded-xl"
                        style={{ backgroundImage: "linear-gradient(135deg, #4db8d4 0%, #2d3a6b 50%, #8b4fb8 100%)" }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "دخول"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
