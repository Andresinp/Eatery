import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AndroidImportance } from 'expo-notifications';

import { api } from './api';
import { env } from './env';
import { logError } from './log';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

// Ask once, after onboarding or the first booking. A refusal is a normal answer, not an error.
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return;
  if (!env.easProjectId) {
    logError('registerForPush', 'no EAS projectId in app config; push is off in this build');
    return;
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Eatery',
      importance: AndroidImportance.HIGH,
    });
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
  registeredToken = token.data;
  await api.registerPushToken(token.data, Platform.OS === 'ios' ? 'ios' : 'android');
}

// On sign-out the token stops belonging to this person.
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await api.removePushToken(registeredToken);
  } catch (error) {
    logError('unregisterPush', error);
  }
  registeredToken = null;
}

// Tapping a notification opens what it is about.
export function routeForNotification(data: { type?: string; order_id?: string | null; listing_id?: string | null }): void {
  if (data.type === 'message' && data.order_id) router.push({ pathname: '/chat/[orderId]', params: { orderId: data.order_id } });
  else if (data.type === 'review_request' && data.order_id) router.push({ pathname: '/review/[orderId]', params: { orderId: data.order_id } });
  else if (data.order_id) router.push({ pathname: '/order/[id]', params: { id: data.order_id } });
  else if (data.listing_id) router.push({ pathname: '/listing/[id]', params: { id: data.listing_id } });
  else router.push('/(tabs)/inbox');
}

const handledIds = new Set<string>();

// Opens the screen for a tapped notification, once per notification (cold start included).
export function useNotificationRouting(isReady: boolean): void {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!isReady || !response) return;
    const id = response.notification.request.identifier;
    if (handledIds.has(id)) return;
    handledIds.add(id);
    routeForNotification(response.notification.request.content.data as Record<string, string | null | undefined>);
  }, [isReady, response]);
}
