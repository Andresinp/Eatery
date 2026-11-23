import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';

// An unconfigured build still has to boot far enough to say so (see app/_layout.tsx), and
// createClient throws on an empty URL. The placeholder is never contacted.
export const supabase = createClient(
  env.isConfigured ? env.supabaseUrl : 'http://127.0.0.1:54321',
  env.isConfigured ? env.supabaseKey : 'unconfigured-build-placeholder-key',
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground (Supabase's React Native guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
