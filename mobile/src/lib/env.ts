import Constants from 'expo-constants';

// Public build config, passed in by app.config.js from the committed ../.env (by name). None of it
// is secret. scripts/check-build-env.mjs checks the shape before a build and greps the bundle after.
type Extra = {
  supabaseUrl?: string;
  supabaseKey?: string;
  stripeKey?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  eas?: { projectId?: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const url = extra.supabaseUrl ?? '';
const key = extra.supabaseKey ?? '';

function isHttpsUrl(value: string): boolean {
  return /^https:\/\/[^/\s]+\.[^/\s]+/.test(value) || /^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2)(:\d+)?/.test(value);
}

export const env = {
  supabaseUrl: url,
  supabaseKey: key,
  isConfigured: isHttpsUrl(url) && key.length >= 30,
  stripeKey: /^pk_(live|test)_\w{10,}$/.test(extra.stripeKey ?? '') ? (extra.stripeKey as string) : '',
  googleWebClientId: extra.googleWebClientId ?? '',
  googleIosClientId: extra.googleIosClientId ?? '',
  easProjectId: extra.eas?.projectId ?? '',
} as const;
