import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useSession } from '@/lib/session';

// Anyone can browse; a signed-in person who has not finished setting up goes to onboarding first.
export default function Gate() {
  const { state } = useSession();
  if (state.phase === 'loading') return <Loading />;
  if (state.phase === 'signedIn' && state.profile && !state.profile.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/explore" />;
}
