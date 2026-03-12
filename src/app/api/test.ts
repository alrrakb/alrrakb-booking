import { createServerClient } from '@supabase/ssr';
import { loadEnvConfig } from '@next/env';
import * as path from 'path';

// Load env vars like Next.js does
loadEnvConfig(path.resolve(__dirname, '..', '..', '..'));

async function test() {
    const adminKey = process.env.NEXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    console.log("URL:", url);
    console.log("Key exists:", !!adminKey);

    try {
        const supabase = createServerClient(url!, adminKey!, {
            cookies: {
                getAll: () => [],
                setAll: () => { }
            }
        });

        const { data, error } = await supabase.from('form_settings').select('*');
        console.log("Data:", data);
        if (error) console.log("Error:", error);
    } catch (e) {
        console.error("Fetch Exception:", e);
    }
}
test();
