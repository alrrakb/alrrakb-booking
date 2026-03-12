"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult<T = null> = {
    success: boolean;
    data?: T;
    error?: string;
};

export async function addBookingOption(payload: { type: string, label: string, order_index: number }): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('booking_options').insert([payload]);

        if (error) {
            console.error("[addBookingOption] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[addBookingOption] Unexpected Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

export async function updateBookingOption(id: string, label: string, order_index: number): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('booking_options').update({ label, order_index }).eq('id', id);

        if (error) {
            console.error("[updateBookingOption] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[updateBookingOption] Unexpected Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

export async function deleteBookingOption(id: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('booking_options').delete().eq('id', id);

        if (error) {
            console.error("[deleteBookingOption] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[deleteBookingOption] Unexpected Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}
