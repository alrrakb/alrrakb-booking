"use client";

import { useState } from "react";
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
        } catch (err) {
            toast.error("حدث خطأ في الاتصال");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-cairo" dir="rtl">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                        TR
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">تسجيل دخول الإدارة</h1>
                    <p className="text-sm text-slate-500 mt-2">نظام حجوزات طلائع الركب</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">اسم المستخدم</label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-slate-50 text-left"
                            dir="ltr"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2">كلمة المرور</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-50 text-left"
                            dir="ltr"
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full h-12 text-md mt-4" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "دخول"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
