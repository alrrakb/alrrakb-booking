import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// Using any for Database type currently as types generation is pending.
// TODO: Generate database.types.ts and use it here.

export async function createSupabaseServerClient() {
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch {
        // Mock cookie store for static site generation phase where cookies() throws
        cookieStore = { getAll: () => [], set: () => { }, has: () => false, get: () => undefined };
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Called from a Server Component — safe to ignore
                    }
                },
            },
        }
    );
}

// For admin operations that bypass RLS (use SERVICE_ROLE_KEY — server only)
export async function createSupabaseAdminClient() {
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch {
        // Mock cookie store for static site generation phase where cookies() throws
        cookieStore = { getAll: () => [], set: () => { }, has: () => false, get: () => undefined };
    }

    // Modern Vercel integrations use NEXT_SUPABASE_SECRET_KEY as the service role key.
    // Fallback to SUPABASE_SERVICE_ROLE_KEY if needed.
    const adminKey = process.env.NEXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("DEBUG [createSupabaseAdminClient]");
    console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("AdminKey exists?:", !!adminKey);

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        adminKey!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );
}
