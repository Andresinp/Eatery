import * as WebBrowser from 'expo-web-browser';

import { logError } from './log';

// Public pages that live outside the app: help, the legal text and how deleting an account works.
// Opened in the in-app browser sheet (fine for reading; nothing is signed in there).
export const SUPPORT_URL = 'https://andresinp.github.io/eatery-legal/';
export const PRIVACY_URL = 'https://andresinp.github.io/eatery-legal/privacy.html';
export const TERMS_URL = 'https://andresinp.github.io/eatery-legal/terms.html';
export const DELETE_ACCOUNT_HELP_URL = 'https://andresinp.github.io/eatery-legal/delete-account.html';

// No support mailbox has been chosen yet; the support page carries the contact details. When one
// exists, set it here and the Help & support screen can offer it.
export const SUPPORT_EMAIL: string | null = 'andresinp@gmail.com';

export function openLink(url: string): void {
  WebBrowser.openBrowserAsync(url).catch((error: unknown) => logError(`openLink ${url}`, error));
}
