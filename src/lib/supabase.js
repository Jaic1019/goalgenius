import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }
  }
)
