// Wklej dane swojego projektu Supabase (Project Settings -> API).
// Mozesz uzyc TEGO SAMEGO projektu co Genzie Hub - wystarczy,
// ze wgralas/es supabase-schema.sql, ktory dodaje nowe tabele
// (g4_codes, g4_questions, g4_answers) obok istniejacych.
const SUPABASE_URL = 'https://TWOJ-PROJEKT.supabase.co';
const SUPABASE_ANON_KEY = 'TWOJ-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
