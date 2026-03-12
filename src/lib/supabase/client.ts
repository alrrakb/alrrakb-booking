import { createBrowserClient } from "@supabase/ssr";
// Using any for Database type currently as types generation is pending.
// TODO: Generate database.types.ts and use it here.

export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
