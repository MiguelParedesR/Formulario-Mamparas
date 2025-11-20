// ============================================================
// supabase.js - Cliente central del nuevo sistema de Incidencias
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ----------------------------------------------
// CREDENCIALES DE TU PROYECTO TPP (seguras)
// ----------------------------------------------
const SUPABASE_URL = "https://qjefbngewwthawycvutl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZWZibmdld3d0aGF3eWN2dXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjA2MTUsImV4cCI6MjA2MTY5NjYxNX0.q4J3bF6oC7x9dhW5cwHr-qtqSSqI_8ju7fHvyfO_Sh0";

// ----------------------------------------------
// CLIENTE GLOBAL SUPABASE
// ----------------------------------------------
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------------------------
// FUNCIONES BÁSICAS (opcional)
// ----------------------------------------------
export function authUser() {
  return supabase.auth.getUser();
}
