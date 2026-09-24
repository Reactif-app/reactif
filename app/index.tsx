import { useI18n } from "@/hooks/useI18n";
import { sessionStore } from "@/store/sessionStore";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const { locale, refreshLocale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [theme, setTheme] = useState(sessionStore.theme);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLocale();
    }, [refreshLocale]),
  );

  const isDark = theme === "dark";
  const bgStyle = { backgroundColor: isDark ? "#353636" : "#fff" };
  const outlineButtonStyle = isDark
    ? { backgroundColor: "#353636", borderColor: "#fff" }
    : { backgroundColor: "#fff", borderColor: "#007BFF" };
  const outlineTextStyle = isDark ? { color: "#fff" } : { color: "#007BFF" };

  const startAdultCpr = () => {
    sessionStore.startNewSession("adult");
    router.push("/cpr");
  };

  const startPediatricCpr = () => {
    sessionStore.startNewSession("pediatric");
    router.push("/childData");
  };
  const startAideCognitive = () => {
    sessionStore.startNewSession("adult");
    router.push("/aideCognitive");
  };
  function startNeonatalCpr() {
    sessionStore.startNewSession("neonatal");
    router.push("/cpr");
  }

  const mainPartner = {
    name: "SFMU",
    url: "https://www.sfmu.org/",
    icon: require("@/assets/images/logo_sfmu_thd.svg"),
  };

  const partners = [
    {
      url: "https://www.chsf.fr/portail/offre-de-soins-18-25.html?args=Y29tcF9pZD00NyZhY3Rpb249ZmljaGVfc2VydmljZSZpZD0xMDMmY29tcG9uZW50PSZtb2R1bGU9Jnw%3D&offre_soin_service_id=103",
      icon: require("@/assets/documents/home/partners/smur-corbeil-essonnes.png"),
    },
    {
      url: "https://reac.univ-lille2.fr/saisie/index.php",
      icon: require("@/assets/documents/home/partners/ReAC_Univ_Lille.png"),
    }
  ];

  const handleOpenPartner = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };
  return (
    <View
      key={`home-${locale}`}
      id="coucou"
      style={[
        styles.container,
        bgStyle,
        { paddingBottom: Math.max(20, insets.bottom + 12) },
      ]}
    >
      <Image
        source={
          isDark
            ? require("@/assets/images/logoWhite.png")
            : require("@/assets/images/logo.png")
        }
        style={styles.logo}
      />
      <View
        style={{
          gap: 30,
          justifyContent: "center",
          width: "100%",
          alignItems: "center",
        }}
      >
        <View style={{ width: "100%", alignItems: "center" }}>
          <View style={styles.partnersContainer}>
            <TouchableOpacity
              style={styles.mainPartnerLink}
              onPress={() => handleOpenPartner(mainPartner.url)}
              activeOpacity={0.8}
              accessibilityRole="link"
              accessibilityLabel="SFMU"
            >
              <Image
                source={mainPartner.icon}
                style={styles.mainPartnerLogo}
                contentFit="contain"
              />
            </TouchableOpacity>
            <View style={styles.secondaryPartnersRow}>
              {partners.map((partner, index) => (
                <TouchableOpacity
                  key={`${partner.url}-${index}`}
                  style={styles.partnerLink}
                  onPress={() => handleOpenPartner(partner.url)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={partner.icon}
                    style={styles.partnerLogo}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.menuButton, outlineButtonStyle]}
            onPress={startAdultCpr}
          >
            <Text style={[styles.menuButtonText, outlineTextStyle]}>
              {t("home.adultCpr")}
            </Text>
          </TouchableOpacity>
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              width: "100%",
              maxWidth: 400,
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              style={[
                styles.menuButton,
                outlineButtonStyle,
                { flex: 1, width: "auto", paddingHorizontal: 5 },
              ]}
              onPress={startPediatricCpr}
            >
              <Text style={[styles.menuSmallButtonText, outlineTextStyle]}>
                {t("home.pediatricCpr")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.menuButton,
                outlineButtonStyle,
                { flex: 1, width: "auto", paddingHorizontal: 5 },
              ]}
              onPress={startNeonatalCpr}
            >
              <Text style={[styles.menuSmallButtonText, outlineTextStyle]}>
                {t("home.neonatalCpr")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ width: "100%", alignItems: "center" }}>
          <TouchableOpacity
            style={[
              styles.buttonHistory,
              styles.bottomAideButton,
              outlineButtonStyle,
            ]}
            onPress={startAideCognitive}
          >
            <Text style={[styles.buttonHistoryText, outlineTextStyle]}>
              {t("home.cognitiveAids")}
            </Text>
          </TouchableOpacity>
          <View style={styles.bottomActionRow}>
            <TouchableOpacity
              style={[
                styles.buttonHistory,
                styles.bottomHistoryButton,
                outlineButtonStyle,
              ]}
              onPress={() => router.push("/history")}
            >
              <Text style={[styles.buttonHistoryText, outlineTextStyle]}>
                {t("home.history")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonHistory,
                styles.bottomSettingsButton,
                outlineButtonStyle,
              ]}
              onPress={() => router.push("/settings")}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Feather
                  name="settings"
                  size={30}
                  color={isDark ? "#fff" : "#007BFF"}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 300,
    height: 200,
    marginBottom: 10,
    resizeMode: "contain",
  },
  menuButton: {
    backgroundColor: "#fff",
    borderColor: "#007BFF",
    borderWidth: 2,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonHistory: {
    paddingVertical: 18,
    backgroundColor: "#fff",
    borderColor: "#007BFF",
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 0,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  bottomActionRow: {
    width: "100%",
    maxWidth: 400,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  bottomHistoryButton: {
    flex: 1,
    height: 62,
    justifyContent: "center",
  },
  bottomAideButton: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 12,
    height: 62,
    justifyContent: "center",
  },
  bottomSettingsButton: {
    width: 74,
    maxWidth: 74,
    height: 62,
    justifyContent: "center",
    marginBottom: 0,
    marginLeft: "auto",
    paddingVertical: 0,
  },
  menuSubButton: {
    backgroundColor: "#fff",
    borderColor: "#007BFF",
    borderWidth: 2,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 160,
    alignItems: "center",
  },
  menuSubButtonText: {
    color: "#007BFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  menuButtonText: {
    color: "#007BFF",
    fontSize: 22,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  menuSmallButtonText: {
    color: "#007BFF",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
  },
  partnersContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    marginBottom: 16,
  },
  mainPartnerLink: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mainPartnerLogo: {
    width: 140,
    height: 80,
  },
  secondaryPartnersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  partnerLink: {
    width: 76,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerLogo: {
    width: 68,
    height: 56,
  },
  buttonHistoryText: {
    color: "#007BFF",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
    lineHeight: 22,
    includeFontPadding: false,
  },
  mainButtons: {
    width: "100%",
    flexDirection: "column",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    height: "100%",
    paddingTop: 10,
    padding: 20,
    backgroundColor: "#25292e",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
