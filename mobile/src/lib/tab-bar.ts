import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The bottom tab bar is a pill that floats over the screen (the map shows around it), so screens
// have to leave room for it themselves.
export const TAB_PILL_HEIGHT = 60;
const MIN_BOTTOM_GAP = 12;

// Distance from the bottom edge of the screen to the pill's bottom.
export function useTabPillBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, MIN_BOTTOM_GAP);
}

// Room the pill takes from the bottom of the screen, including its gap.
export function useTabBarSpace(): number {
  return useTabPillBottom() + TAB_PILL_HEIGHT;
}
