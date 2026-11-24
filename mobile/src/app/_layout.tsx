import "@/i18n";

import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Empty, Screen } from "@/components/ui";
import { env } from "@/lib/env";
import { deviceLanguage, setLanguage } from "@/lib/language";
import { useNotificationRouting } from "@/lib/push";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

void SplashScreen.preventAutoHideAsync();
setLanguage(deviceLanguage());

function Payments({ children }: { children: ReactElement }) {
  // Without a publishable key the booking screen explains that payments are not set up.
  if (!env.stripeKey) return children;
  return (
    <StripeProvider
      publishableKey={env.stripeKey}
      merchantIdentifier="merchant.com.andresinp.eatery"
      urlScheme="eatery"
    >
      {children}
    </StripeProvider>
  );
}

function AppStack() {
  const { state } = useSession();
  useNotificationRouting(state.phase !== "loading");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="filters"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.75, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="book/[id]" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="review/[orderId]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="report" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="host/new"
        options={{ presentation: "fullScreenModal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const { t } = useTranslation();
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const isReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <StatusBar style="dark" />
          {env.isConfigured ? (
            <SessionProvider>
              <Payments>
                <AppStack />
              </Payments>
            </SessionProvider>
          ) : (
            <Screen scroll={false}>
              <Empty
                icon="alert"
                title={t("app.notConfigured.title")}
                body={t("app.notConfigured.body")}
              />
            </Screen>
          )}
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
