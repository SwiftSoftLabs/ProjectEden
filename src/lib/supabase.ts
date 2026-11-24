
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vite only exposes VITE_* vars; the old NEXT_PUBLIC_DB_SCHEMA read was always undefined.
const dbSchema = import.meta.env.VITE_DB_SCHEMA || 'app_projecteden';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials in .env file');
}

export const supabase = createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        db: {
            schema: dbSchema
        }
    }
);
