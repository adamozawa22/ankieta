// Wklej dane swojego projektu Supabase (Project Settings -> API).
// Mozesz uzyc TEGO SAMEGO projektu co Genzie Hub - wystarczy,
// ze wgralas/es supabase-schema.sql, ktory dodaje nowe tabele
// (g4_codes, g4_questions, g4_answers) obok istniejacych.
const SUPABASE_URL = 'https://spgtnyyqetlpewuvktqd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZ3RueXlxZXRscGV3dXZrdHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDQ3NTAsImV4cCI6MjEwMjkyMDc1MH0.B8eDOv4xZyfSMqjsWg0UFnkd2J8UzzpyJiZ4WECn0Io';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
