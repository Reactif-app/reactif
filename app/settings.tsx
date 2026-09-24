import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomSwitch from "@/components/CustomSwitch";
import { useI18n } from "@/hooks/useI18n";
import {
  localeLabels,
  supportedLocales,
  type Locale,
  type LocalePreference,
} from "@/i18n";
import { useCprSettings } from "@/hooks/useCprSettings";
import { sessionStore } from "@/store/sessionStore";

export default function SettingsScreen() {
  const router = useRouter();
  const { locale, localePreference, setLocalePreference, t } = useI18n();
  const [theme, setTheme] = useState(sessionStore.theme);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLocalePreference, setSelectedLocalePreference] =
    useState<LocalePreference>(localePreference);

  useEffect(() => {
    // Subscribe to sessionStore changes
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedLocalePreference(localePreference);
  }, [localePreference]);

  const {
    shockDuration,
    cordaroneDuration,
    adrenalineDuration,
    warningSeconds,
    endButtonShortTap,
    previewMaxVolume,
    updateSettings,
    setEndButtonShortTap,
    setPreviewMaxVolume,
    resetSettings,
    loading,
  } = useCprSettings();

  const [shockInput, setShockInput] = useState("");
  const [cordaroneInput, setCordaroneInput] = useState("");
  const [adrenalineInput, setAdrenalineInput] = useState("");
  const [warningInput, setWarningInput] = useState("");

  useEffect(() => {
    if (!loading) {
      setShockInput((shockDuration / 60).toString());
      setCordaroneInput((cordaroneDuration / 60).toString());
      const adrenalineMinutes = Math.min(
        5,
        Math.max(3, Math.round(adrenalineDuration / 60)),
      );
      setAdrenalineInput(adrenalineMinutes.toString());
      setWarningInput(warningSeconds.toString());
    }
  }, [
    adrenalineDuration,
    cordaroneDuration,
    loading,
    shockDuration,
    warningSeconds,
  ]);

  const handleAdrenalinePickerChange = (nextMinutes: number) => {
    const clamped = Math.min(5, Math.max(3, Math.round(nextMinutes)));
    const next = clamped.toString();
    setAdrenalineInput(next);
    updateSettings("adrenaline", clamped * 60);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme === "light" ? "#fff" : "#353636" },
        ]}
      >
        <Text style={{ color: theme === "light" ? "#353636" : "#fff" }}>
          {t("common.loading")}
        </Text>
      </View>
    );
  }

  const handleDurationChange = (
    key: "shock" | "cordarone" | "adrenaline",
    text: string,
  ) => {
    if (key === "shock") {
      setShockInput(text);
    } else if (key === "cordarone") {
      setCordaroneInput(text);
    } else {
      setAdrenalineInput(text);
    }

    const value = parseFloat(text);
    if (!isNaN(value)) {
      // Convert minutes to seconds for storage
      updateSettings(key, Math.round(value * 60));
    }
  };

  const handleWarningChange = (text: string) => {
    setWarningInput(text);
  };

  const handleSave = async () => {
    await setLocalePreference(selectedLocalePreference);

    const shockVal = parseFloat(shockInput);
    if (!isNaN(shockVal)) {
      updateSettings("shock", Math.round(shockVal * 60));
    }

    const cordaroneVal = parseFloat(cordaroneInput);
    if (!isNaN(cordaroneVal)) {
      updateSettings("cordarone", Math.round(cordaroneVal * 60));
    }

    const adrenalineVal = parseFloat(adrenalineInput);
    if (!isNaN(adrenalineVal)) {
      updateSettings("adrenaline", Math.round(adrenalineVal * 60));
    }

    const warningVal = parseInt(warningInput, 10);
    if (!isNaN(warningVal)) {
      updateSettings("warning", warningVal);
    }
    router.back();
  };

  const onSelectSwitch = async (val: number) => {
    const newTheme = val === 1 ? "light" : "dark";
    await sessionStore.setTheme(newTheme);
  };

  const handleResetSettings = async () => {
    await resetSettings();
  };

  const languageLabel = t(localeLabels[locale]);
  const selectedLanguageLabel =
    selectedLocalePreference === "device"
      ? languageLabel
      : t(localeLabels[selectedLocalePreference]);
  const languagePreferenceLabel =
    selectedLocalePreference === "device"
      ? `${t("settings.deviceLanguage")} (${selectedLanguageLabel})`
      : selectedLanguageLabel;
  const isDark = theme === "dark";
  const canChooseLanguageInApp = Platform.OS !== "ios";
  const bgStyle = { backgroundColor: isDark ? "#353636" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : "#000" };
  const inputBgStyle = {
    backgroundColor: isDark ? "#222121" : "#f9f9f9",
    borderColor: isDark ? "#555" : "#ccc",
  };
  const sectionTitleColor = { color: isDark ? "#ddd" : "#333" };
  const labelColor = { color: isDark ? "#aaa" : "#555" };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <View
        style={[styles.header, { borderBottomColor: isDark ? "#333" : "#eee" }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <Text style={[styles.title, textStyle]}>{t("settings.title")}</Text>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text
            style={[styles.sectionTitle, sectionTitleColor, { marginTop: 20 }]}
          >
            {t("settings.appTheme")}
          </Text>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <CustomSwitch
              selectionMode={theme === "light" ? 1 : 2}
              roundCorner={true}
              option1={t("settings.light")}
              option2={t("settings.dark")}
              onSelectSwitch={onSelectSwitch}
              selectionColor={"#007BFF"}
              isDark={isDark}
            />
          </View>
          {canChooseLanguageInApp && (
            <>
              <Text style={[styles.sectionTitle, sectionTitleColor]}>
                {t("settings.language")}
              </Text>
              <TouchableOpacity
                style={[
                  styles.navigationRow,
                  {
                    borderColor: isDark ? "#444" : "#d1d5db",
                    backgroundColor: isDark ? "#222121" : "#f9fafb",
                  },
                ]}
                onPress={() => setLanguageModalVisible(true)}
              >
                <View style={styles.navigationRowContent}>
                  <Ionicons
                    name="language-outline"
                    size={22}
                    color={isDark ? "#e2e8f0" : "#334155"}
                  />
                  <View style={styles.toggleTextBlock}>
                    <Text style={[styles.toggleTitle, textStyle]}>
                      {languagePreferenceLabel}
                    </Text>
                    <Text style={[styles.toggleSubtitle, labelColor]}>
                      {t("settings.currentLanguage", { language: languageLabel })}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={isDark ? "#e2e8f0" : "#334155"}
                />
              </TouchableOpacity>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDark ? "#3a3b3c" : "#e5e7eb" },
                ]}
              />
            </>
          )}
          <Text style={[styles.sectionTitle, sectionTitleColor]}>
            {t("settings.defaultDurations")}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, labelColor]}>
              {t("settings.analysisInterval")}
            </Text>
            <View style={[styles.inputWrapper, inputBgStyle]}>
              <TextInput
                style={[styles.input, textStyle]}
                keyboardType="numeric"
                value={shockInput}
                onChangeText={(text) => handleDurationChange("shock", text)}
              />
              <Text style={styles.unit}>min</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, labelColor]}>
              {t("settings.adrenalineInterval")}
            </Text>
            <View style={[styles.inputWrapper, inputBgStyle]}>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() =>
                    handleAdrenalinePickerChange(
                      parseInt(adrenalineInput, 10) - 1,
                    )
                  }
                >
                  <Text style={[styles.pickerButtonText, textStyle]}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerValue, textStyle]}>
                  {adrenalineInput}
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() =>
                    handleAdrenalinePickerChange(
                      parseInt(adrenalineInput, 10) + 1,
                    )
                  }
                >
                  <Text style={[styles.pickerButtonText, textStyle]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.unit}>min</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, labelColor]}>
              {t("settings.warningBeforeTimerEnd")}
            </Text>
            <View style={[styles.inputWrapper, inputBgStyle]}>
              <TextInput
                style={[styles.input, textStyle]}
                keyboardType="numeric"
                value={warningInput}
                onChangeText={handleWarningChange}
              />
              <Text style={styles.unit}>sec</Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? "#3a3b3c" : "#e5e7eb" },
            ]}
          />

          <Text style={[styles.sectionTitle, sectionTitleColor]}>
            {t("settings.soundSettings")}
          </Text>
          <TouchableOpacity
            style={[
              styles.navigationRow,
              {
                borderColor: isDark ? "#444" : "#d1d5db",
                backgroundColor: isDark ? "#222121" : "#f9fafb",
              },
            ]}
            onPress={() => router.push("/soundSettings" as any)}
          >
            <View style={styles.navigationRowContent}>
              <Ionicons
                name="musical-notes-outline"
                size={22}
                color={isDark ? "#e2e8f0" : "#334155"}
              />
              <View style={styles.toggleTextBlock}>
                <Text style={[styles.toggleTitle, textStyle]}>
                  {t("settings.soundSettings")}
                </Text>
                <Text style={[styles.toggleSubtitle, labelColor]}>
                  {t("settings.soundSettingsSubtitle")}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isDark ? "#e2e8f0" : "#334155"}
            />
          </TouchableOpacity>
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? "#3a3b3c" : "#e5e7eb" },
            ]}
          />

          <Text style={[styles.sectionTitle, sectionTitleColor]}>
            Comportement - Fin de la RCP
          </Text>
          <TouchableOpacity
            style={[
              styles.toggleRow,
              { borderColor: isDark ? "#444" : "#d1d5db" },
            ]}
            onPress={() => setEndButtonShortTap(!endButtonShortTap)}
          >
            <View style={styles.toggleTextBlock}>
              <Text style={[styles.toggleTitle, textStyle]}>
                Mode urgence: bouton Fin RCP en appui court
              </Text>
              <Text style={[styles.toggleSubtitle, labelColor]}>
                Activé : appui court, désactivé : appui long (par défaut)
              </Text>
            </View>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: endButtonShortTap ? "#22c55e" : "#9ca3af",
                },
              ]}
            >
              <Text style={styles.pillText}>
                {endButtonShortTap ? "ACTIF" : "INACTIF"}
              </Text>
            </View>
          </TouchableOpacity>
          {/*
          <Text style={[styles.sectionTitle, sectionTitleColor]}>
            Fonctionnalités expérimentales
          </Text>
         <TouchableOpacity
            style={[
              styles.toggleRow,
              { borderColor: isDark ? "#444" : "#d1d5db" },
            ]}
            onPress={() => setPreviewMaxVolume(!previewMaxVolume)}
          >
               <View style={styles.toggleTextBlock}>
              <Text style={[styles.toggleTitle, textStyle]}>
                Maximiser le volume sur Android
              </Text>
              <Text style={[styles.toggleSubtitle, labelColor]}>
                {
                  "Le volume sera monté au maximum à l'ouverture de l'application."
                }
              </Text>
            </View> 

            <View
              style={[
                styles.pill,
                {
                  backgroundColor: previewMaxVolume ? "#22c55e" : "#9ca3af",
                },
              ]}
            >
              <Text style={styles.pillText}>
                {previewMaxVolume ? "ACTIF" : "INACTIF"}
              </Text>
            </View>
          </TouchableOpacity>*/}

          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? "#3a3b3c" : "#e5e7eb" },
            ]}
          />

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => void handleResetSettings()}
          >
            <Text style={styles.resetButtonText}>{t("settings.resetAllSettings")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.aboutButton,
              {
                borderColor: isDark ? "#64748b" : "#94a3b8",
                backgroundColor: isDark ? "#1f2937" : "#f8fafc",
              },
            ]}
            onPress={() =>
              router.push({ pathname: "/about", params: { us: "value" } })
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={isDark ? "#e2e8f0" : "#334155"}
            />
            <Text
              style={[
                styles.aboutButtonText,
                { color: isDark ? "#e2e8f0" : "#334155" },
              ]}
            >
              {t("settings.about")}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: isDark ? "#2b2c2d" : "#fff",
              borderTopColor: isDark ? "#444" : "#e5e7eb",
            },
          ]}
        >
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {t("settings.saveAndBack")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {canChooseLanguageInApp && (
        <Modal
          animationType="fade"
          transparent
          visible={languageModalVisible}
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setLanguageModalVisible(false)}
            />
            <View
              style={[
                styles.languageModal,
                {
                  backgroundColor: isDark ? "#222121" : "#fff",
                  borderColor: isDark ? "#444" : "#e5e7eb",
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, textStyle]}>
                  {t("settings.language")}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setLanguageModalVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={isDark ? "#e5e7eb" : "#111827"}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  {
                    borderColor:
                      selectedLocalePreference === "device"
                        ? "#007BFF"
                        : isDark
                          ? "#444"
                          : "#d1d5db",
                    backgroundColor:
                      selectedLocalePreference === "device"
                        ? isDark
                          ? "#0f3767"
                          : "#e6f0ff"
                        : "transparent",
                  },
                ]}
                onPress={() => {
                  setSelectedLocalePreference("device");
                  setLanguageModalVisible(false);
                }}
              >
                <View style={styles.languageOptionText}>
                  <Text style={[styles.toggleTitle, textStyle]}>
                    {t("settings.deviceLanguage")}
                  </Text>
                  <Text style={[styles.toggleSubtitle, labelColor]}>
                    {t("settings.deviceLanguageSubtitle")}
                  </Text>
                </View>
                {selectedLocalePreference === "device" ? (
                  <Ionicons name="checkmark" size={22} color="#007BFF" />
                ) : null}
              </TouchableOpacity>

              <ScrollView style={styles.languageOptionsList}>
                {supportedLocales.map((option: Locale) => {
                  const isSelected = selectedLocalePreference === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.languageOption,
                        {
                          borderColor: isSelected
                            ? "#007BFF"
                            : isDark
                              ? "#444"
                              : "#d1d5db",
                          backgroundColor: isSelected
                            ? isDark
                              ? "#0f3767"
                              : "#e6f0ff"
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setSelectedLocalePreference(option);
                        setLanguageModalVisible(false);
                      }}
                    >
                      <Text style={[styles.toggleTitle, textStyle]}>
                        {t(localeLabels[option])}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={22} color="#007BFF" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  body: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#000",
  },
  unit: {
    fontSize: 16,
    color: "#888",
    marginLeft: 8,
  },
  pickerRow: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  pickerButtonText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
  },
  pickerValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "center",
  },
  divider: {
    height: 2,
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  languageModal: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  languageOptionsList: {
    marginTop: 8,
  },
  languageOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  languageOptionText: {
    flex: 1,
    minWidth: 0,
  },
  resetButton: {
    marginTop: 28,
    padding: 16,
    backgroundColor: "#FF5252",
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    lineHeight: 20,
    textAlign: "center",
    includeFontPadding: false,
  },
  aboutButton: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  aboutButtonText: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "uppercase",
    lineHeight: 19,
    textAlign: "center",
    includeFontPadding: false,
  },
  saveButton: {
    padding: 16,
    backgroundColor: "#5cc668",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    lineHeight: 20,
    textAlign: "center",
    includeFontPadding: false,
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  navigationRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  navigationRowContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleTextBlock: {
    flex: 1,
    minWidth: 180,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "center",
  },
  pillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
