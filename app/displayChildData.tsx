import { t } from "@/i18n";
import { PediatricData } from "@/models/session";
import { sessionStore } from "@/store/sessionStore";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DisplayChildData() {
  const [theme, setTheme] = useState(sessionStore.theme);
  const isDark = theme === "dark";
  const bgStyle = { backgroundColor: isDark ? "#353636" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : "#000" };
  const cardBgStyle = { backgroundColor: isDark ? "#2a2e33" : "#f0f0f0" };
  const labelStyle = { color: isDark ? "#ccc" : "#666" };

  const [data, setData] = useState<PediatricData | undefined>(
    sessionStore.getPediatricData(),
  );
  const computeMode = sessionStore.getComputeMode();

  useEffect(() => {
    return sessionStore.subscribe(() => {
      setData(sessionStore.getPediatricData());
      setTheme(sessionStore.theme);
    });
  }, []);

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, bgStyle]}>
        <Text style={styles.errorText}>
          {t("childData.noData")}
        </Text>
      </SafeAreaView>
    );
  }

  const {
    ageValue,
    ageMode,
    weight,
    adrenalineDose,
    cordaroneDose,
    energyDose,
  } = data;
  // Only show age if computeMode is 'age'
  const shouldShowAge = ageValue > 0 && computeMode === "age";
  const isAdultAge = ageMode === "years" && ageValue > 12;

  const handleStartPediatricCpr = () => {
    sessionStore.resetCurrentSessionStartTime();
    router.push("/cpr");
  };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <View style={styles.scrollContent}>
        <View style={[styles.card, cardBgStyle]}>
          {shouldShowAge && (
            <>
              <Text style={[styles.label, labelStyle]}>{t("childData.age")}:</Text>
              <Text style={[styles.value, textStyle]}>
                {ageValue} {ageMode === "months" ? t("childData.months") : t("childData.years")}
              </Text>
            </>
          )}

          {computeMode === "age" && !isAdultAge && (
            <Text style={[styles.label, labelStyle]}>{t("childData.estimatedWeight")}</Text>
          )}

          {computeMode === "weight" && !isAdultAge && (
            <Text style={[styles.label, labelStyle]}>{t("childData.enteredWeight")}</Text>
          )}

          {!isAdultAge && (
            <Text style={[styles.value, textStyle]}>{weight} kg</Text>
          )}

          <View style={styles.separator} />

          <Text style={[styles.label, labelStyle]}>{t("session.adrenaline")} (IV/IO):</Text>
          <Text style={[styles.value, textStyle]}>{adrenalineDose ? `${adrenalineDose} mg` : "N/A"}</Text>

          <Text style={[styles.label, labelStyle]}>Amiodarone ({t("session.cordarone")}):</Text>
          <Text style={[styles.value, textStyle]}>{cordaroneDose ? `${cordaroneDose} mg` : "N/A"}</Text>

          {!isAdultAge && (
            <>
              <Text style={[styles.label, labelStyle]}>
                {t("childData.electricShockEnergy")}
              </Text>
              <Text style={[styles.value, textStyle]}>
                {energyDose ? `${energyDose} J` : "N/A"}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.validationButton}
          onPress={handleStartPediatricCpr}
        >
          <Text style={styles.validationButtonText}>
            {t("childData.startCpr")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.push("/childData")}
        >
          <Text style={styles.validationButtonText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
  },
  scrollContent: {
    height: "100%",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  card: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#90EE90",
    borderRadius: 12,
    padding: 20,
    backgroundColor: "#2a2e33",
  },
  label: {
    color: "#ccc",
    fontSize: 16,
    marginTop: 10,
  },
  value: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 15,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
  },
  validationButton: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    width: "100%",
    maxWidth: 230,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  validationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 20,
    includeFontPadding: false,
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    width: "100%",
    maxWidth: 230,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
