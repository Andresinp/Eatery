import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { ApiError } from './api';
import { env } from './env';
import { supabase } from './supabase';

// Sign in with Apple (iOS), Google (both, when configured) and email + password (existing web
// users and the App Review demo account). Guideline 4.8: offering Google on iOS requires Apple.

export const isGoogleConfigured = (): boolean =>
  env.googleWebClientId.length > 0 && (Platform.OS !== 'ios' || env.googleIosClientId.length > 0);

export async function isAppleAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
}

// Returns false when the person closed the Apple sheet (not an error).
export async function signInWithApple(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw error;
  }
  if (!credential.identityToken) throw new ApiError('auth_failed', 'Apple returned no identity token');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
  if (error) throw new ApiError('auth_failed', error.message);
  // Apple gives the name only on the very first sign-in: keep it.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (name) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from('profiles').update({ full_name: name }).eq('id', data.user.id).is('full_name', null);
  }
  return true;
}

// Returns false when the person closed the Google sheet.
export async function signInWithGoogle(): Promise<boolean> {
  // Loaded lazily: the native module exists only in builds where Google sign-in is configured.
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: env.googleWebClientId, iosClientId: env.googleIosClientId || undefined });
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return false;
    const idToken = response.data.idToken;
    if (!idToken) throw new ApiError('auth_failed', 'Google returned no id token');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw new ApiError('auth_failed', error.message);
    return true;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return false;
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new ApiError(/invalid/i.test(error.message) ? 'invalid_credentials' : 'auth_failed', error.message);
}

// Returns true when a session started straight away, false when the project wants the email
// confirmed first.
export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw new ApiError('email_taken', error.message);
    if (/password/i.test(error.message)) throw new ApiError('weak_password', error.message);
    throw new ApiError('auth_failed', error.message);
  }
  return data.session !== null;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new ApiError('auth_failed', error.message);
}
