import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

// After any sign-in: close the auth sheets and let the gate at "/" decide (onboarding or explore).
export function leaveAuthAfterSignIn(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}

// "Not now" and close buttons: back to whatever they were browsing.
export function closeAuth(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/explore');
}
