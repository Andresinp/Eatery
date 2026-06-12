import { supabase } from "./supabase";

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase isn't configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email: string) {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function signInWithOAuth(provider: "google" | "apple") {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function sendPhoneOtp(phone: string) {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!supabase) throw new Error("Supabase isn't configured.");
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
