// One place errors are reported. Today the console (visible in Xcode / logcat); swap for a crash
// reporter later without touching call sites.
export function logError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  console.warn(`[eatery] ${where}: ${message}`);
}
