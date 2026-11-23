#!/usr/bin/env node
// Build gate (workspace rule build-env.md). A misconfigured build succeeds exactly like a correct
// one, so check the config's SHAPE before building and the BUNDLE after. Reports names and
// verdicts only, never values, so it is safe in a public CI log.
//
//   node scripts/check-build-env.mjs pre            config → is each value shaped right?
//   node scripts/check-build-env.mjs post <dir>     exported bundle → does it contain the real host?
//
// Values are read by name from the web app's committed ../.env (and mobile/.env if present), the
// same way app.config.js reads them, with the process environment winning as in Expo.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const mode = process.argv[2];

function readDotEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const fileEnv = { ...readDotEnv(join(root, '..', '.env')), ...readDotEnv(join(root, '.env')) };
const get = (k) => process.env[k] ?? fileEnv[k] ?? '';

const url = get('VITE_SUPABASE_URL');
const key = get('VITE_SUPABASE_PUBLISHABLE_KEY') || get('VITE_SUPABASE_ANON_KEY');
const stripe = get('VITE_STRIPE_PUBLISHABLE_KEY');

const checks = [
  ['VITE_SUPABASE_URL is https with a real host', /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)],
  ['VITE_SUPABASE_PUBLISHABLE_KEY looks like a key (>= 30 chars, not a placeholder)', key.length >= 30 && !/^[-x.]+$/i.test(key)],
];
const warnings = [
  ['VITE_STRIPE_PUBLISHABLE_KEY set (booking deposits)', /^pk_(live|test)_\w{10,}$/.test(stripe)],
  ['VITE_STRIPE_PUBLISHABLE_KEY is live, not test', /^pk_live_/.test(stripe)],
  ['EXPO_PUBLIC_EAS_PROJECT_ID set (push notifications)', get('EXPO_PUBLIC_EAS_PROJECT_ID').length > 10],
];

let ok = true;
if (mode === 'pre') {
  for (const [name, pass] of checks) {
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}`);
    ok &&= pass;
  }
  for (const [name, pass] of warnings) console.log(`${pass ? 'ok  ' : 'WARN'} ${name}`);
} else if (mode === 'post') {
  const dir = process.argv[3] ?? join(root, 'dist');
  const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  let found = false;
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|hbc|bundle|json|plist)$/.test(n) && readFileSync(p).includes(host)) found = true;
    }
  };
  if (host && existsSync(dir)) walk(dir);
  console.log(`${found ? 'ok  ' : 'FAIL'} ${dir.replace(root, '')} contains the configured Supabase host`);
  ok = found;
} else {
  console.error('usage: check-build-env.mjs pre | post [dir]');
  process.exit(2);
}
process.exit(ok ? 0 : 1);
