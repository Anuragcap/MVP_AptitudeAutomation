import { createClient } from '@supabase/supabase-js'

// Supabase project URL and anon key
const supabaseUrl = ''
const supabaseAnonKey = ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// OpenAI API configuration - Replace with your actual key
export const OPENAI_API_KEY = ''
