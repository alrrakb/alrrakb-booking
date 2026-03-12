"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult<T = null> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'select' | 'multi-select';

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    placeholder: string | null;
    is_required: boolean;
    options: string[] | null;
    max_selections: number | null;
    order_index: number;
    created_at?: string;
}

export interface FormSettings {
    id?: string;
    submit_button_text: string;
}

// ----------------------------------------------------------------------
// FORM METADATA READS (Public / Client Server)
// ----------------------------------------------------------------------

export async function getFormFields(): Promise<FormField[]> {
    try {
        const supabase = await createSupabaseAdminClient(); // Can also be standard createSupabaseServerClient, but Admin ensures read if RLS defaults change
        const { data, error } = await supabase
            .from('form_fields')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            console.error("[getFormFields] DB Error:", error.message);
            return [];
        }
        return data as FormField[];
    } catch (err: unknown) {
        console.error("[getFormFields] Unexpected Error:", err);
        return [];
    }
}

export async function getFormSettings(): Promise<FormSettings | null> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { data, error } = await supabase
            .from('form_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is multiple/no rows
            console.error("[getFormSettings] DB Error:", error.message);
            return null;
        }
        return data as FormSettings;
    } catch (err: unknown) {
        console.error("[getFormSettings] Unexpected Error:", err);
        return null;
    }
}

// ----------------------------------------------------------------------
// FORM SETTINGS WRITES (Admin Only)
// ----------------------------------------------------------------------

export async function updateFormSettings(submit_button_text: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();

        // Check if exists
        const { data: existing } = await supabase.from('form_settings').select('id').single();

        let error;
        if (existing) {
            const { error: updateError } = await supabase.from('form_settings').update({ submit_button_text }).eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('form_settings').insert([{ submit_button_text }]);
            error = insertError;
        }

        if (error) {
            console.error("[updateFormSettings] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMessage };
    }
}

// ----------------------------------------------------------------------
// FORM FIELD WRITES (Admin Only)
// ----------------------------------------------------------------------

type SaveFieldPayload = Omit<FormField, 'id' | 'created_at'>;

export async function addFormField(payload: SaveFieldPayload): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('form_fields').insert([payload]);

        if (error) {
            console.error("[addFormField] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMessage };
    }
}

export async function updateFormField(id: string, payload: SaveFieldPayload): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('form_fields').update(payload).eq('id', id);

        if (error) {
            console.error("[updateFormField] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMessage };
    }
}

export async function deleteFormField(id: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('form_fields').delete().eq('id', id);

        if (error) {
            console.error("[deleteFormField] DB Error:", error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMessage };
    }
}

export async function reorderFormFields(orderedIds: string[]): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();

        // Execute updates sequentially or using bulk update if supported
        for (let i = 0; i < orderedIds.length; i++) {
            const { error } = await supabase.from('form_fields').update({ order_index: i }).eq('id', orderedIds[i]);
            if (error) {
                console.error("[reorderFormFields] Error on ID", orderedIds[i], ":", error.message);
                return { success: false, error: error.message };
            }
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMessage };
    }
}
