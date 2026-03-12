import { Suspense } from "react";
import { AdminClientLayout } from "./AdminClientLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "لوحة التحكم | طلائع الركب",
    description: "لوحة تحكم إدارة الحجوزات لمؤسسة طلائع الركب",
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/logo.png",
    },
};

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
            <AdminClientLayout>{children}</AdminClientLayout>
        </Suspense>
    );
}
