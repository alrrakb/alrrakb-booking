"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'

export async function submitBooking(values: {
    name: string;
    phone: string;
    hotel: string;
    rooms_count: string;
    view_type: string;
    meals: string;
    check_in: Date;
    check_out: Date;
}) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    const { data, error } = await supabase
        .from('bookings')
        .insert([
            {
                hotel: values.hotel,
                rooms_count: values.rooms_count,
                view_type: values.view_type,
                meals: values.meals,
                check_in: values.check_in,
                check_out: values.check_out,
                phone: values.phone,
                name: values.name || null,
                status: 'pending'
            },
        ])
        .select()

    if (error) {
        console.error("Error inserting booking:", error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}
