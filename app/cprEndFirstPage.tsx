import { useFocusEffect } from "expo-router/react-navigation";
import { router, Stack } from "expo-router";
import React from "react";
import {
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sessionStore } from "@/store/sessionStore";
import { t } from "@/i18n";

export default function CprEndFirstPage() {
  const [theme, setTheme] = React.useState(sessionStore.theme);

  React.useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== "android") return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => {
        subscription.remove();
      };
    }, []),
  );

  const handleDeath = async () => {
    await sessionStore.saveCurrentSession("Décès");
    router.push({ pathname: "/cprEnd", params: { mode: "death" } });
  };

  const handleRacs = () => {
    sessionStore.logEvent("event", "RACS");
    router.push({ pathname: "/cprEnd", params: { mode: "racs" } });
  };

  const bgStyle =
    theme === "dark"
      ? { backgroundColor: "#353636" }
      : { backgroundColor: "#fff" };
  const isDark = theme === "dark";
  const neutralButtonColor = isDark ? "#fff" : "#007BFF";
  const outlineButtonStyle = {
    backgroundColor: "transparent",
    borderColor: neutralButtonColor,
  };
  const outlineButtonTextStyle = { color: neutralButtonColor };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.contentContainer}>
        <Text style={[styles.title, isDark ? { color: "#ccc" } : {}]}>
          {t("cprEndFirst.title")}
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton, outlineButtonStyle]}
            onPress={handleDeath}
          >
            <Text style={[styles.buttonText, outlineButtonTextStyle]}>
              {t("cprEndFirst.death")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton, outlineButtonStyle]}
            onPress={handleRacs}
          >
            <View>
              <Text
                style={[
                  styles.buttonText,
                  outlineButtonTextStyle,
                  { fontSize: 20 },
                ]}
              >
                {t("cprEndFirst.racs")}
              </Text>
              <Text
                style={[
                  styles.buttonText,
                  outlineButtonTextStyle,
                  { fontSize: 8 },
                ]}
              >
                {t("cprEndFirst.racsLong")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  buttonGroup: {
    width: "100%",
    gap: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderColor: "#007BFF",
    color: "#007BFF",
    borderRadius: 12,
    shadowColor: "#000",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  deathButton: {
    borderColor: "#333",
  },
  racsButton: {
    borderColor: "#28a745",
  },
  stopButton: {
    borderColor: "#d9534f",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
    textTransform: "uppercase",
    lineHeight: 24,
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: false,
  },
  deathText: {
    color: "#333",
  },
  racsText: {
    color: "#28a745",
  },
  stopText: {
    color: "#d9534f",
  },
});
