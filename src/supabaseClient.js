import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SALDO_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SALDO_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan variables VITE_SALDO_SUPABASE_URL o VITE_SALDO_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
