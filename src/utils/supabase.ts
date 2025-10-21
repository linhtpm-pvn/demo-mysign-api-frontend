import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://cxtyqzwrrwrmrjgqgvea.supabase.co"
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dHlxendycndybXJqZ3FndmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTQyNTgsImV4cCI6MjA3NTAzMDI1OH0.Ls6PCrgJAbTnKSpmNTW1ZOIJO03BHeaxyGIDP2jJv0E"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);