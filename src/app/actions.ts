"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from 'next/headers'

export async function submitBooking(values: Record<string, any>) {
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
                // Assign whatever standard keys might still be mapped randomly
                hotel: values.hotel || null,
                rooms_count: values.rooms_count || null,
                view_type: values.view_type || null,
                meals: values.meals || null,
                check_in: values.check_in || null,
                check_out: values.check_out || null,
                phone: values.phone || null,
                name: values.name || null,
                status: 'pending',
                // Store the raw dynamic payload as JSONB
                payload: values,
            },
        ])
        .select()

    if (error) {
        console.error("Error inserting booking:", error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function getBookingOptions() {
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
                    }
                },
            },
        }
    )

    const { data, error } = await supabase
        .from('booking_options')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Error fetching booking options:", error)
        return []
    }

    return data
}

import { revalidatePath } from 'next/cache'

export async function addBookingOption(payload: { type: string, label: string, order_index: number }) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { error } = await supabase.from('booking_options').insert([payload]);
    if (error) {
        console.error("DB Error (Add Option):", error);
    } else {
        revalidatePath('/');
        revalidatePath('/admin');
    }
    return { success: !error, error };
}

export async function updateBookingOption(id: string, label: string, order_index: number) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { error } = await supabase.from('booking_options').update({ label, order_index }).eq('id', id);
    if (error) {
        console.error("DB Error (Update Option):", error);
    } else {
        revalidatePath('/');
        revalidatePath('/admin');
    }
    return { success: !error, error };
}

export async function deleteBookingOption(id: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { error } = await supabase.from('booking_options').delete().eq('id', id);
    if (error) {
        console.error("DB Error (Delete Option):", error);
    } else {
        revalidatePath('/');
        revalidatePath('/admin');
    }
    return { success: !error, error };
}
