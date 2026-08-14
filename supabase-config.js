var SUPABASE_URL = "https://oguukuhflamwmgrbdqfk.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DfUyGsd9bdFBJmouRZf5Rw_SQBnUYXE";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  throw new Error("Supabase library failed to load. Please refresh the page and check your internet connection.");
}

var supabaseClient = window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

window.NEBRIN_SUPABASE_URL = SUPABASE_URL;
window.NEBRIN_SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
