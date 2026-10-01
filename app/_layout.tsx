import { sessionController } from "@/controllers/SessionController";
import {
  initializeI18n,
  subscribeLocale,
  syncLocaleWithDeviceSettings,
} from "@/i18n";
import { sessionStore } from "@/store/sessionStore";
import { useKeepAwake } from "expo-keep-awake";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";

const APP_FONT_FAMILY = Platform.select({
  ios: "System",
  android: "Roboto",
  default: "System",
});

const TextAny = Text as any;
const TextInputAny = TextInput as any;

const textDefaultProps = TextAny.defaultProps || {};
TextAny.defaultProps = {
  ...textDefaultProps,
  style: [textDefaultProps.style, { fontFamily: APP_FONT_FAMILY }],
};

const textInputDefaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps = {
  ...textInputDefaultProps,
  style: [textInputDefaultProps.style, { fontFamily: APP_FONT_FAMILY }],
};

export default function RootLayout() {
  useKeepAwake();
  const [theme, setTheme] = useState(sessionStore.theme);
  const [i18nReady, setI18nReady] = useState(false);
  const [, setLocaleTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    void sessionController.initAudioAtMaxVolume();
    void initializeI18n().finally(() => {
      if (isMounted) {
        setI18nReady(true);
      }
    });

    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    const unsubscribeLocale = subscribeLocale(() => {
      setLocaleTick((v) => v + 1);
    });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncLocaleWithDeviceSettings();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeLocale();
      appStateSubscription.remove();
    };
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <PaperProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar
          style={theme === "dark" ? "light" : "dark"}
        />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="cpr"
            options={{
              headerShown: false,
              freezeOnBlur: true,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="cprEndFirstPage"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="cprEnd"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="about" options={{ headerShown: false }} />
          <Stack.Screen name="childData" options={{ headerShown: false }} />
          <Stack.Screen name="cprPediatric" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="soundSettings" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ headerShown: false }} />
          <Stack.Screen
            name="displayChildData"
            options={{ headerShown: false }}
          />
        </Stack>
      </GestureHandlerRootView>
    </PaperProvider>
  );
}
