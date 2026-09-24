import CustomSwitch from "@/components/CustomSwitch";
import { t } from "@/i18n";
import { sessionStore } from "@/store/sessionStore";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

//For Android platforms (for animations)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AgeMode = "months" | "years";

export default function ChildData() {
  const [theme, setTheme] = useState(sessionStore.theme);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  const isDark = theme === "dark";
  const bgStyle = { backgroundColor: isDark ? "#353636" : "#fff" };
  const textStyle = { color: isDark ? "#fff" : "#000" };
  const expandedBg = { backgroundColor: isDark ? "#353636" : "#f9f9f9" };
  const footerBg = {
    backgroundColor: isDark ? "#353636" : "#f9f9f9",
    borderTopColor: isDark ? "#333" : "#ccc",
  };
  const aideButtonStyle = {
    backgroundColor: isDark ? "transparent" : "#fff",
    borderColor: isDark ? "#fff" : "#007BFF",
  };
  const aideButtonTextStyle = { color: isDark ? "#fff" : "#007BFF" };

  const [inputMode, setInputMode] = useState<"age" | "weight" | null>(null);
  const [validationPopupVisible, setValidationPopupVisible] = useState(false);
  const [validationPopupMessage, setValidationPopupMessage] = useState("");

  {
    /* Animation for the expansion of the content */
  }
  const [expanded, setExpanded] = useState(false);
  const toggleExpand = () => {
    //Animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!expanded) {
      setWeightExpanded(false);
      setInputMode("age");
    } else {
      setInputMode(null);
    }
    setExpanded(!expanded);
  };

  // Age input states
  const [mode, setMode] = useState<AgeMode | undefined>("months");
  const [valeurTemp, setValeurTemp] = useState("");

  const onSelectSwitch = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (index === 1) {
      setMode("months");
    } else {
      setMode("years");
    }
    setValeurTemp("");
  };

  {
    /* Weight expansion state */
  }
  const [weightExpanded, setWeightExpanded] = useState(false);
  const toggleWeightExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!weightExpanded) {
      setExpanded(false);
      setInputMode("weight");
    } else {
      setInputMode(null);
    }
    setWeightExpanded(!weightExpanded);
  };

  const MONTHLY_WEIGHTS = [3, 4, 5, 5.5, 6, 6.5, 7, 8, 8.5, 9, 9, 9.5];

  const calculateWeightFromAge = (age: number, mode: AgeMode | undefined) => {
    if (isNaN(age) || age < 0 || !mode) return null;

    const strategies: Record<AgeMode, () => number | null> = {
      months: () => (age < 12 ? (MONTHLY_WEIGHTS[age] ?? null) : null),
      years: () => {
        if (age >= 1 && age < 5) {
          return (age + 4) * 2;
        } else if (age >= 5 && age <= 12) {
          return age * 4;
        } else {
          return null;
        }
      },
    };

    return strategies[mode] ? strategies[mode]() : null;
  };
  const parsedAge = parseInt(valeurTemp, 10);

  {
    /* Weight input state */
  }
  const [weightInput, setWeightInput] = useState("");

  // Only use the value from the currently expanded section
  let finalWeight: number | null = null;
  if (expanded && !weightExpanded) {
    // Age section expanded, weight section collapsed
    finalWeight = calculateWeightFromAge(parsedAge, mode);
  } else if (weightExpanded && !expanded) {
    // Weight section expanded, age section collapsed
    finalWeight = weightInput
      ? parseFloat(weightInput) <= 50
        ? parseFloat(weightInput)
        : 50
      : null;
  } else {
    // If both are collapsed or both are expanded, default to null
    finalWeight = null;
  }

  const adrenalineDose = finalWeight ? ( 0.01 * finalWeight).toFixed(2) : null;
  const cordaroneDose = finalWeight ? (5 * finalWeight).toFixed(1) : null;
  const energyDose = finalWeight ? (4 * finalWeight).toFixed(0) : null;

  const handleValidation = () => {
    if (inputMode === "age" && !valeurTemp) {
      setValidationPopupMessage(t("childData.invalidAgeMessage"));
      setValidationPopupVisible(true);
      return;
    }
    if (inputMode === "weight" && !weightInput) {
      setValidationPopupMessage(t("childData.invalidWeightMessage"));
      setValidationPopupVisible(true);
      return;
    }
    if (!inputMode) {
      setValidationPopupMessage(t("childData.invalidInputMessage"));
      setValidationPopupVisible(true);
      return;
    }

    if (inputMode === "age" && mode === "months" && parsedAge >= 12) {
      setValidationPopupMessage(t("childData.invalidAgeOver12MonthsMessage"));
      setValidationPopupVisible(true);
      return;
    }

    const isAdultAge = inputMode === "age" && mode === "years" && parsedAge > 12;
    const savedAdrenalineDose = isAdultAge ? "1" : adrenalineDose ?? undefined;
    const savedCordaroneDose = isAdultAge ? "300" : cordaroneDose ?? undefined;
    const savedEnergyDose = isAdultAge ? undefined : energyDose ?? undefined;
    const savedWeight = isAdultAge ? undefined : finalWeight ?? 0;

    const ageVal = parsedAge || 0;
    const currentMode = mode || "years"; // Default if only weight is entered, though logically ageMode might not matter if weight is manual. Let's keep it simple.

    // Save to store
    sessionStore.setPediatricData({
      inputMode: inputMode,
      ageMode: currentMode,
      ageValue: ageVal,
      ...(savedWeight !== undefined ? { weight: savedWeight } : {}),
      adrenalineDose: savedAdrenalineDose,
      cordaroneDose: savedCordaroneDose,
      ...(savedEnergyDose !== undefined ? { energyDose: savedEnergyDose } : {}),
    });

    router.push("/displayChildData");
  };

  return (
    <SafeAreaView
      style={[{ flex: 1 }, bgStyle]}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, bgStyle]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.titleText, textStyle]}>
            {t("childData.title")}
          </Text>
          {/* Always show Age button, but only expand if not hidden by weight input */}
          <TouchableOpacity style={styles.choiceButton} onPress={toggleExpand}>
            <Text style={styles.choiceButtonText}>{t("childData.age")}</Text>
          </TouchableOpacity>
          {/* Content that disappear/appear */}
          {expanded && !weightExpanded && (
            <View style={[styles.expandedContent, expandedBg]}>
              <View style={{ marginVertical: 20 }}>
                <CustomSwitch
                  selectionMode={mode === "years" ? 2 : 1}
                  roundCorner={true}
                  option1={t("childData.months")}
                  option2={t("childData.years")}
                  onSelectSwitch={onSelectSwitch}
                  selectionColor={"#007BFF"}
                />
              </View>

              <View style={styles.agePickerContainer}>
                <Text style={styles.expandedButtonText}>
                  {mode === "months"
                    ? t("childData.enterAgeMonths")
                    : t("childData.enterAgeYears")}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Ex: 10"
                  placeholderTextColor="#ccc"
                  value={valeurTemp}
                  onChangeText={(text) => {
                    setValeurTemp(text);
                  }}
                />
              </View>
            </View>
          )}
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={toggleWeightExpand}
          >
            <Text style={styles.choiceButtonText}>
              {t("childData.weightKg")}
            </Text>
          </TouchableOpacity>

          {weightExpanded && (
            <View style={[styles.expandedContent, expandedBg]}>
              <View style={styles.weightPickerContainer}>
                <Text style={styles.expandedButtonText}>
                  {t("childData.enterWeightKg")}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 12,5"
                  placeholderTextColor="#ccc"
                  keyboardType="decimal-pad" // Allow decimals for weight
                  value={weightInput}
                  onChangeText={(text) => {
                    setWeightInput(text.replace(",", "."));
                    // If user types here, we probably unset age mode or keep it but rely on weightInput
                  }}
                  maxLength={5} // e.g. 45.5 or 110.2
                />
              </View>
            </View>
          )}

          <Text style={styles.infoText}>
            RCP adulte pour gabarit adulte (habituellement à la puberté, vers
            12-14 ans, ou si plus que 50kg).
          </Text>
          <View style={{ marginTop: 1, marginBottom: 2, marginLeft: 16 }}>
            <Text style={[styles.infoText]}>
              {"\u2022"} Nourissons de moins de 12 mois: (âge en mois + 9)/2
            </Text>
            <Text style={[styles.infoText]}>
              {"\u2022"} Inférieur à 5 ans : (âge+4)x2
            </Text>
            <Text style={[styles.infoText]}>
              {"\u2022"} Supérieur à 5 ans : âge x 4
            </Text>
          </View>
          <Text style={styles.infoText}>
            Penser à regarder l&apos;âge sur l&apos;étiquette des vêtements.
          </Text>

          <Text
            style={[styles.infoText, { fontSize: 11, fontStyle: "italic" }]}
          >
            Tinning K, Acworth J. Make your Best Guess : an updated method for
            paediatric weight estimation in emergencies. Emerg Med Australas.
            2007 Dec;19(6):528-34{" "}
          </Text>

          <TouchableOpacity
            style={[
              {
                paddingVertical: 18,
                borderWidth: 2,
                borderRadius: 12,
                marginBottom: 12,
                width: "100%",
                maxWidth: 400,
                alignItems: "center",
                elevation: 3,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                height: 62,
                justifyContent: "center",
              },
              aideButtonStyle,
            ]}
            onPress={() => router.push("/aideCognitive")}
          >
            <Text
              style={[
                {
                  fontSize: 18,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  lineHeight: 22,
                  includeFontPadding: false,
                },
                aideButtonTextStyle,
              ]}
            >
              Ouvrir les aides cognitives
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {(expanded || weightExpanded) && (
          <View style={[styles.footer, footerBg]}>
            <TouchableOpacity
              style={styles.validationButton}
              onPress={handleValidation}
            >
              <Text style={styles.subButtonText}>Calculer</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          transparent
          visible={validationPopupVisible}
          animationType="fade"
          onRequestClose={() => setValidationPopupVisible(false)}
        >
          <View style={styles.popupOverlay}>
            <TouchableOpacity
              style={styles.popupBackdrop}
              activeOpacity={1}
              onPress={() => setValidationPopupVisible(false)}
            />
            <View
              style={[
                styles.popupCard,
                {
                  backgroundColor: isDark ? "#1f1111" : "#fff",
                  borderColor: "#f5282895",
                },
              ]}
            >
              <Text style={styles.popupTitle}>{t("childData.invalidAgeTitle")}</Text>
              <Text style={styles.popupMessage}>{validationPopupMessage}</Text>
              <TouchableOpacity
                style={styles.popupButton}
                onPress={() => setValidationPopupVisible(false)}
              >
                <Text style={styles.popupButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 100,
    paddingBottom: 150,
    paddingHorizontal: 20,
    justifyContent: "flex-start",
    gap: 10,
    backgroundColor: "#25292e",
    alignItems: "center",
  },
  titleText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    alignSelf: "center",
  },
  choiceButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  choiceButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  expandedContent: {
    backgroundColor: "#25292e",
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  expandedButtonText: {
    color: "#7a7c8a",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  agePickerContainer: {
    alignItems: "center",
    width: "80%",

    justifyContent: "space-between",
    gap: 10,
  },

  weightPickerContainer: {
    alignItems: "center",
    width: "80%",
    justifyContent: "space-between",
    gap: 10,
  },
  subButton: {
    backgroundColor: "#66b2ff", // Lighter blue
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  subButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    color: "#000",
    padding: 10,
    borderRadius: 8,
    width: "100%",
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,
    textAlign: "center",
  },
  inputButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modeButtonSelected: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  activeTab: { backgroundColor: "#007AFF" },
  activeTabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tabText: {
    color: "#007AFF",
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
  },
  validationButton: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 10,
    width: "100%",
    maxWidth: 150,
    alignItems: "center",
    alignSelf: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  infoText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
  },
  aideSection: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
    marginBottom: 20,
    gap: 10,
  },
  aideSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  aideSectionText: {
    color: "#d1d5db",
    fontSize: 14,
    textAlign: "center",
  },
  aideButton: {
    backgroundColor: "#007BFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  aideButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#25292e",
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "center",
  },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  popupCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  popupTitle: {
    color: "#f5282895",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  popupMessage: {
    color: "#f5282895",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  popupButton: {
    marginTop: 18,
    backgroundColor: "#f5282895",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  popupButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
