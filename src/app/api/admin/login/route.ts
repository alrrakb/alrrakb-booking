import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (
            username === process.env.ADMIN_USER &&
            password === process.env.ADMIN_PASS
        ) {
            const cookieStore = await cookies();
            cookieStore.set("admin_token", process.env.ADMIN_TOKEN_SECRET!, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: "/",
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { success: false, error: "بيانات الدخول غير صحيحة" },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}
