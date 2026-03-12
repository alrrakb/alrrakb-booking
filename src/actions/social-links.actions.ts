"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult<T = null> = {
    success: boolean;
    data?: T;
    error?: string;
};

export interface SocialLink {
    id: string;
    platform_name: string;
    url: string;
    order_index: number;
    created_at?: string;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { data, error } = await supabase
            .from('social_links')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            console.error("[getSocialLinks] DB Error:", error.message);
            return [];
        }
        return data as SocialLink[];
    } catch (err: unknown) {
        console.error("[getSocialLinks] Unexpected Error:", err);
        return [];
    }
}

type SaveSocialLinkPayload = Omit<SocialLink, 'id' | 'created_at'>;

export async function addSocialLink(payload: SaveSocialLinkPayload): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('social_links').insert([payload]);

        if (error) {
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

export async function updateSocialLink(id: string, payload: SaveSocialLinkPayload): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('social_links').update(payload).eq('id', id);

        if (error) {
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

export async function deleteSocialLink(id: string): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();
        const { error } = await supabase.from('social_links').delete().eq('id', id);

        if (error) {
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

export async function reorderSocialLinks(orderedIds: string[]): Promise<ActionResult> {
    try {
        const supabase = await createSupabaseAdminClient();

        for (let i = 0; i < orderedIds.length; i++) {
            const { error } = await supabase.from('social_links').update({ order_index: i }).eq('id', orderedIds[i]);
            if (error) {
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
