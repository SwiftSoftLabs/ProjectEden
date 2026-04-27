
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const dbSchema = import.meta.env.NEXT_PUBLIC_DB_SCHEMA || 'public';

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
