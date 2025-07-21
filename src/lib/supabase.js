import { createClient } from '@supabase/supabase-js'

// Supabase project URL and anon key
const supabaseUrl = 'https://jokpdjrzxganbbzibqgo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impva3BkanJ6eGdhbmJiemlicWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTU2ODEsImV4cCI6MjA2ODM5MTY4MX0.xNxLaCVV55QbYHFFUDD6VFKo3LTfkECc-vUnost4XXc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// OpenAI API configuration - Replace with your actual key
export const OPENAI_API_KEY = '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'