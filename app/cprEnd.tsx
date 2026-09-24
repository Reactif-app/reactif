import { FontAwesome5 } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router/react-navigation";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

import EventSelectionModal from "@/components/EventSelectionModal";
import { sessionController } from "@/controllers/SessionController";
import { t } from "@/i18n";
import { CprEvent, CprSession } from "@/models/session";
import { sessionStore } from "@/store/sessionStore";
import {
  CprEpisodeSummary,
  formatElapsedFromStart,
  formatEventDetails,
  formatEventType,
  formatHumanReadableTime,
  formatTimeWithLetters,
  generateSessionHtml,
  getCprDurationMs,
  getCprEpisodeSummaries,
  getEventsWithCycles,
} from "@/utils/sessionUtils";
import { router, Stack, useLocalSearchParams } from "expo-router";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export default function CprEnd() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [theme, setTheme] = useState(sessionStore.theme);
  const isDark = theme === "dark";
  const bgStyle = isDark ? { backgroundColor: "#353636" } : {};
  const textStyle = { color: isDark ? "#fff" : "#374151" };
  const mutedTextStyle = { color: isDark ? "#cbd5e1" : "#64748b" };
  const cardStyle = {
    backgroundColor: isDark ? "#222121" : "#fff",
    borderColor: isDark ? "#555" : "#e5e7eb",
  };

  const dividerStyle = { backgroundColor: isDark ? "#555" : "#EEEEEE" };
  const neutralButtonColor = isDark ? "#fff" : "#007BFF";
  const outlineButtonStyle = {
    backgroundColor: "transparent",
    borderColor: neutralButtonColor,
    borderWidth: 2,
  };
  const outlineButtonTextStyle = { color: neutralButtonColor };
  const summaryPrimaryIconColor = isDark ? neutralButtonColor : "#fff";
  const summarySecondaryIconColor = isDark ? neutralButtonColor : "#334155";
  const params = useLocalSearchParams();
  const initialMode = params.mode === "death" ? "summary" : "racs";

  const [step, setStep] = useState<"racs" | "summary">(initialMode as any);
  const [session, setSession] = useState<CprSession | null>(null);
  const cprMode = session?.mode || sessionStore.getSession()?.mode || "adult";
  const ecgDurationSeconds = 8 * 60;
  const [ecgTimeLeft, setEcgTimeLeft] = useState(ecgDurationSeconds);
  const ecgAlertedRef = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [racsElapsedSeconds, setRacsElapsedSeconds] = useState(0);
  const racsStartRef = useRef<number | null>(null);
  const ecgBounceAnim = useRef(new Animated.Value(1)).current;
  const fadeColor =
    isDark ? "#353636" : step === "summary" ? "#f3f4f6" : "#fff";
  const summaryActionBottom = Math.max(16, insets.bottom + 16);
  const summaryScrollPaddingBottom = 84 + summaryActionBottom;
  const summaryFadeBottom = summaryActionBottom + 58;

  const renderBottomFade = (style?: object) => (
    <View pointerEvents="none" style={[styles.bottomScrollFade, style]}>
      {[0.05, 0.18, 0.36, 0.62, 0.9].map((opacity) => (
        <View
          key={opacity}
          style={[
            styles.bottomScrollFadeBand,
            { backgroundColor: fadeColor, opacity },
          ]}
        />
      ))}
    </View>
  );

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

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const current = sessionStore.getSession();
    setSession(current);

    if (params.mode === "death") {
      setStep("summary");
    } else {
      setStep("racs");
    }
  }, [params.mode]);

  useEffect(() => {
    if (step !== "racs") return;

    const startTime = Date.now();
    setEcgTimeLeft(ecgDurationSeconds);
    ecgAlertedRef.current = false;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, ecgDurationSeconds - elapsed);
      setEcgTimeLeft(remaining);

      if (remaining === 0 && !ecgAlertedRef.current) {
        ecgAlertedRef.current = true;
        sessionController.playReminderPattern("end");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ecgDurationSeconds, step]);

  useEffect(() => {
    if (step !== "racs") return;

    racsStartRef.current = Date.now();
    const update = () => {
      if (racsStartRef.current) {
        setRacsElapsedSeconds(
          Math.floor((Date.now() - racsStartRef.current) / 1000),
        );
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleResume = () => {
    // "Reprendre la RCP"
    sessionStore.logEvent("event", "RESUME");
    router.dismissAll();
    router.replace("/cpr");
  };

  const handleDeath = async () => {
    // "Décès"
    await sessionStore.saveCurrentSession("Décès");
    setSession(sessionStore.getSession());
    setStep("summary");
  };

  const handleConfirmEnd = async () => {
    // "Arrêter définitivement" (RACS -> Stop)
    await sessionStore.saveCurrentSession("Arrêt définitif");
    setSession(sessionStore.getSession());
    setStep("summary");
  };

  const handleOpenAideCognitive = () => {
    router.push("/aideCognitive");
  };

  const handleEcgPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sessionStore.logEvent("event", "ECG");
  };

  const handleEvent = () => setModalVisible(true);

  const handleSaveEvents = (selectedEvents: string[]) => {
    sessionController.logEvents(selectedEvents);
  };

  const handleExportPdf = async () => {
    if (!session) return;

    const html = generateSessionHtml(session);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      console.log("File has been saved to:", uri);
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (error) {
      Alert.alert(t("cprEnd.exportErrorTitle"), t("cprEnd.exportErrorMessage"));
      console.error(error);
    }
  };

  const handleGoHome = () => {
    sessionStore.startNewSession(); // Reset for next time
    router.replace("/");
  };

  const getDurationString = () => {
    if (!session) return t("cprEnd.durationMinutesSeconds", { minutes: 0, seconds: 0 });

    const diff = getCprDurationMs(session);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return t("cprEnd.durationMinutesSeconds", { minutes, seconds });
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatShortClockTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const renderEventSummaryLine = (label: string, events: CprEvent[]) => (
    <Text style={[styles.cardText, textStyle]}>
      <Text style={styles.summaryLineLabel}>{label}</Text> :{" "}
      <Text style={styles.boldValue}>{events.length}</Text>
      {events.map((event, index) => (
        <Text key={`${label}-${event.timestamp}-${index}`}>
          {" "}
          <Text style={styles.boldValue}>({index + 1})</Text>{" "}
          {formatShortClockTime(event.timestamp)}
        </Text>
      ))}
    </Text>
  );

  const renderCprEpisodeSummary = (
    episode: CprEpisodeSummary,
    hasMultipleEpisodes: boolean,
  ) => {
    const durationSeconds = Math.max(
      0,
      Math.floor((episode.endTime - episode.startTime) / 1000),
    );

    return (
      <View
        key={`cpr-summary-${episode.cycle}`}
        style={hasMultipleEpisodes ? styles.cprEpisodeBlock : undefined}
      >
        <Text style={[styles.cardText, styles.cprSummaryTitle, textStyle]}>
          {hasMultipleEpisodes
            ? t("cprEnd.cprSummaryCycle", { cycle: episode.cycle })
            : t("cprEnd.cprSummary")}
        </Text>
        <Text style={[styles.cardText, textStyle]}>
          {t("cprEnd.cprDurationCycle", { cycle: episode.cycle })} :{" "}
          <Text style={styles.boldValue}>{formatTime(durationSeconds)}</Text>
        </Text>
        {renderEventSummaryLine(t("cprEnd.shocks"), episode.shock)}
        {renderEventSummaryLine(t("session.adrenaline"), episode.adrenaline)}
        {renderEventSummaryLine(t("session.cordarone"), episode.cordarone)}
      </View>
    );
  };

  const getActions = () => {
    if (!session) return [];
    return getEventsWithCycles(session).filter(({ event }) =>
      ["analysis", "shock", "cordarone", "adrenaline"].includes(event.type),
    );
  };

  const getCustomEvents = () => {
    if (!session) return [];
    return getEventsWithCycles(session).filter(
      ({ event }) => event.type === "event",
    );
  };

  const ecgSize = Math.min(width - 120, 150);
  const ecgStrokeWidth = 12;
  const ecgRadius = (ecgSize - ecgStrokeWidth) / 2;
  const ecgCircumference = 2 * Math.PI * ecgRadius;
  const ecgCenter = ecgSize / 2;
  const ecgInnerSize = ecgSize - 45;
  const ecgInnerRadius = ecgInnerSize / 2;
  const ecgProgress =
    ecgDurationSeconds > 0 ? ecgTimeLeft / ecgDurationSeconds : 0;
  const ecgStrokeDashoffset = ecgCircumference * (1 - ecgProgress);
  const cprEpisodeSummaries = session ? getCprEpisodeSummaries(session) : [];

  if (step === "racs") {
    return (
      <SafeAreaView style={[styles.container, bgStyle]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.confirmContainer}>
          <Text style={[styles.title, isDark ? { color: "#ccc" } : {}]}>
            {t("cprEnd.racsTitle")}
          </Text>

          <View style={[styles.card, cardStyle, styles.racsSummaryCard]}>
            <View
              style={[
                styles.racsTimerCard,
                isDark
                  ? { backgroundColor: "#353636", borderColor: "#fff" }
                  : {},
              ]}
            >
              <Text style={[styles.racsTimerLabel, textStyle]}>
                {t("cprEnd.racsSince")}
              </Text>
              <Text style={[styles.racsTimerValue, textStyle]}>
                {formatTime(racsElapsedSeconds)}
              </Text>
            </View>

            <View>
              {cprEpisodeSummaries.length > 0 ? (
                cprEpisodeSummaries.map((episode) =>
                  renderCprEpisodeSummary(
                    episode,
                    cprEpisodeSummaries.length > 1,
                  ),
                )
              ) : (
                <Text style={[styles.cardText, textStyle]}>
                  {t("cprEnd.cprSummary")}
                </Text>
              )}
            </View>

            {cprMode !== "neonatal" ? (
              <View style={styles.ecgSection}>
                <AnimatedTouchableOpacity
                  onPress={handleEcgPress}
                  onPressIn={() => {
                    Animated.timing(ecgBounceAnim, {
                      toValue: 0.95,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.timing(ecgBounceAnim, {
                      toValue: 1,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.ecgButton,
                    {
                      width: ecgSize,
                      height: ecgSize,
                      transform: [{ scale: ecgBounceAnim }],
                    },
                  ]}
                >
                  <Svg width={ecgSize} height={ecgSize}>
                    <G rotation="-90" origin={`${ecgCenter}, ${ecgCenter}`}>
                      <Circle
                        cx={ecgCenter}
                        cy={ecgCenter}
                        r={ecgRadius}
                        stroke="#f5dd4b"
                        strokeWidth={ecgStrokeWidth}
                        fill="none"
                      />
                      <Circle
                        cx={ecgCenter}
                        cy={ecgCenter}
                        r={ecgRadius}
                        stroke="#FF5252"
                        strokeWidth={ecgStrokeWidth}
                        strokeDasharray={ecgCircumference}
                        strokeDashoffset={ecgStrokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </G>
                  </Svg>
                  <View
                    style={[
                      styles.ecgInner,
                      {
                        width: ecgInnerSize,
                        height: ecgInnerSize,
                        borderRadius: ecgInnerRadius,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="heart-pulse"
                      size={40}
                      style={[
                        isDark
                          ? { color: "#fff", marginBottom: 4 }
                          : { color: "#000", marginBottom: 4 },
                      ]}
                    />
                    <Text
                      style={[
                        styles.ecgLabel,
                        isDark ? { color: "#fff" } : { color: "#000" },
                      ]}
                    >
                      {t("cprEnd.ecg")}
                    </Text>
                    <Text
                      style={[
                        styles.ecgTimer,
                        isDark ? { color: "#fff" } : { color: "#000" },
                      ]}
                    >
                      {formatTime(ecgTimeLeft)}
                    </Text>
                  </View>
                </AnimatedTouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.buttonGroupConfirm}>
            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                styles.outlineButton,
                outlineButtonStyle,
              ]}
              onPress={handleResume}
            >
              <Text style={[styles.buttonText, outlineButtonTextStyle]}>
                {t("cprEnd.resumeCpr")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                styles.outlineButton,
                outlineButtonStyle,
              ]}
              onPress={handleDeath}
            >
              <Text style={[styles.buttonText, outlineButtonTextStyle]}>
                {t("cprEndFirst.death")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                styles.outlineButton,
                outlineButtonStyle,
              ]}
              onPress={handleConfirmEnd}
            >
              <Text style={[styles.buttonText, outlineButtonTextStyle]}>
                {t("cprEnd.interventionEnd")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                styles.outlineButton,
                outlineButtonStyle,
              ]}
              onPress={handleEvent}
            >
              <Text style={[styles.buttonText, outlineButtonTextStyle]}>
                {t("cprEnd.addEvent")}
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.racsSeparator,
                { backgroundColor: isDark ? "#6b7280" : "#d1d5db" },
              ]}
            />

            <TouchableOpacity
              style={[
                styles.buttonConfirm,
                styles.outlineButton,
                outlineButtonStyle,
              ]}
              onPress={handleOpenAideCognitive}
            >
              <Text style={[styles.buttonText, outlineButtonTextStyle]}>
                {t("cprEnd.cognitiveAids")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <EventSelectionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveEvents}
        />
        {renderBottomFade()}
      </SafeAreaView>
    );
  }

  const actions = getActions();
  const customEvents = getCustomEvents();
  const summaryTitle =
    session?.events.find((e: any) => e.type === "cpr_end")?.details ||
    t("cprEnd.sessionEnd");

  return (
    <SafeAreaView style={[styles.container, styles.summaryContainer, bgStyle]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.summaryScroll,
          { paddingBottom: summaryScrollPaddingBottom },
        ]}
      >
        <View style={[styles.headerCard, cardStyle]}>
          <Text
            style={[
              styles.headerTitle,
              isDark ? { color: "#fff" } : { color: "#111827" },
            ]}
          >
            {summaryTitle === "Décès" ? t("cprEnd.deathUpper") : t("cprEnd.cprSummaryUpper")}
          </Text>
        </View>

        {/* Stats Card */}
        <View style={[styles.card, cardStyle]}>
          <View style={[styles.cardRow]}>
            <Text style={[styles.summaryCardText, textStyle]}>
              <Text style={styles.summaryCardLabel}>
                {t("cprEnd.totalDurationUpper")}
              </Text>
              :{" "}
              {getDurationString()}
            </Text>
          </View>
          {cprEpisodeSummaries.length > 0 ? (
            <View style={styles.summaryEpisodesContainer}>
              {cprEpisodeSummaries.map((episode) =>
                renderCprEpisodeSummary(
                  episode,
                  cprEpisodeSummaries.length > 1,
                ),
              )}
            </View>
          ) : (
            <React.Fragment>
              <View style={[styles.cardRow, { marginTop: 8 }]}>
                {renderEventSummaryLine(
                  t("cprEnd.shocksDelivered"),
                  session
                    ? session.events.filter((event) => event.type === "shock")
                    : [],
                )}
              </View>
              <View style={[styles.cardRow, { marginTop: 8 }]}>
                {renderEventSummaryLine(
                  t("cprEnd.adrenalineUpper"),
                  session
                    ? session.events.filter(
                        (event) => event.type === "adrenaline",
                      )
                    : [],
                )}
              </View>
              <View style={[styles.cardRow, { marginTop: 8 }]}>
                {renderEventSummaryLine(
                  t("cprEnd.cordaroneUpper"),
                  session
                    ? session.events.filter(
                        (event) => event.type === "cordarone",
                      )
                    : [],
                )}
              </View>
            </React.Fragment>
          )}
          {summaryTitle === "Décès" && (
            <View style={[styles.cardRow, { marginTop: 8 }]}>
              <Text style={[styles.summaryCardText, textStyle]}>
                <Text style={styles.summaryCardLabel}>
                  {t("cprEnd.deathTimeUpper")}
                </Text>
                :{" "}
                {session?.endTime
                  ? formatTimeWithLetters(session.endTime)
                  : "N/A"}
              </Text>
            </View>
          )}
        </View>

        {/* Pediatrics Card */}
        {session?.pediatricData && (
          <View style={[styles.card, cardStyle]}>
            <Text style={[styles.cardTitle, textStyle]}>
              {t("cprEnd.pediatricData")}:
            </Text>
            <View style={[styles.divider, dividerStyle]} />
            {session.pediatricData.inputMode === "weight" ? (
              <Text style={[styles.itemText, textStyle]}>
                {t("historyDetail.weight")}: {session.pediatricData.weight} kg
              </Text>
            ) : (
              <Text style={[styles.itemText, textStyle]}>
                {t("historyDetail.age")}: {session.pediatricData.ageValue}{" "}
                {session.pediatricData.ageMode}
              </Text>
            )}
            <Text style={[styles.itemText, textStyle]}>
              {t("session.adrenaline")}: {session.pediatricData.adrenalineDose ? `${session.pediatricData.adrenalineDose} mg` : "N/A"}
            </Text>
            <Text style={[styles.itemText, textStyle]}>
              {t("session.cordarone")}: {session.pediatricData.cordaroneDose ? `${session.pediatricData.cordaroneDose} mg` : "N/A"}
            </Text>
          </View>
        )}

        {/* Actions Card */}
        <View style={[styles.card, cardStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textStyle]}>
              {t("cprEnd.actionsDone")}:
            </Text>
          </View>
          <View style={[styles.divider, dividerStyle]} />
          {actions.length === 0 ? (
            <Text style={[styles.emptyText, isDark ? { color: "#aaa" } : {}]}>
              {t("cprEnd.noAction")}
            </Text>
          ) : (
            actions.map(({ event, cycle }, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={[styles.itemText, textStyle]}>
                  • [RCP {cycle}] {formatEventType(event.type)}
                </Text>
                <Text style={[styles.itemTimestamp, mutedTextStyle]}>
                  {t("cprEnd.elapsedTime")}:{" "}
                  {formatElapsedFromStart(session!.startTime, event.timestamp)}{" "}
                  | {t("cprEnd.time")}: {formatTimeWithLetters(event.timestamp)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Events Card */}
        <View style={[styles.card, cardStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textStyle]}>
              {t("cprEnd.enteredEvents")}:
            </Text>
          </View>
          <View style={[styles.divider, dividerStyle]} />
          {customEvents.length === 0 ? (
            <Text style={[styles.emptyText, isDark ? { color: "#aaa" } : {}]}>
              {t("cprEnd.noEvent")}
            </Text>
          ) : (
            customEvents.map(({ event, cycle }, i: number) => (
              <View key={i} style={styles.itemRow}>
                <Text style={[styles.itemText, textStyle]}>
                  • [RCP {cycle}] {formatEventDetails(event.details)}
                </Text>
                <Text style={[styles.itemTimestamp, mutedTextStyle]}>
                  {t("cprEnd.elapsedTime")}:{" "}
                  {formatElapsedFromStart(session!.startTime, event.timestamp)}{" "}
                  | {t("cprEnd.time")}: {formatHumanReadableTime(event.timestamp)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Buttons */}
      <View
        style={[
          styles.actionButtonsContainer,
          { bottom: summaryActionBottom },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primarySummaryButton,
            isDark ? outlineButtonStyle : undefined,
          ]}
          onPress={handleExportPdf}
        >
          <FontAwesome5
            name="file-pdf"
            size={18}
            color={summaryPrimaryIconColor}
          />
          <Text
            style={[
              styles.actionButtonText,
              isDark ? outlineButtonTextStyle : styles.primaryActionButtonText,
            ]}
          >
            {t("cprEnd.exportPdf")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.secondarySummaryButton,
            isDark ? outlineButtonStyle : undefined,
          ]}
          onPress={handleGoHome}
        >
          <FontAwesome5
            name="home"
            size={18}
            color={summarySecondaryIconColor}
          />
          <Text
            style={[
              styles.actionButtonText,
              isDark
                ? outlineButtonTextStyle
                : styles.secondaryActionButtonText,
            ]}
          >
            {t("cprEnd.backHome")}
          </Text>
        </TouchableOpacity>
      </View>
      {renderBottomFade([
        styles.summaryBottomScrollFade,
        { bottom: summaryFadeBottom },
      ])}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  summaryContainer: {
    backgroundColor: "#f3f4f6",
  },
  summaryScroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryTitle: {
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconWidth: {
    width: 24,
    textAlign: "center",
    marginRight: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  summaryCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    flexWrap: "wrap",
  },
  summaryCardLabel: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  summaryLineLabel: {
    fontWeight: "700",
  },
  boldValue: {
    fontWeight: "700",
  },
  cprSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  cprEpisodeBlock: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 10,
  },
  summaryEpisodesContainer: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  itemText: {
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 4,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemTimestamp: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 12,
  },
  cycleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0D47A1",
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  cycleContainer: {
    marginBottom: 10,
  },

  actionButtonsContainer: {
    backgroundColor: "transparent",
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: false,
  },
  primarySummaryButton: {
    backgroundColor: "#2563eb",
  },
  secondarySummaryButton: {
    backgroundColor: "#e2e8f0",
  },
  primaryActionButtonText: {
    color: "#fff",
  },
  secondaryActionButtonText: {
    color: "#334155",
  },
  bottomScrollFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 42,
  },
  summaryBottomScrollFade: {
    bottom: 74,
  },
  bottomScrollFadeBand: {
    flex: 1,
  },

  // Confirm styles
  confirmContainer: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
  },
  racsSummaryCard: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingBottom: 8,
  },
  racsTimerCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#333",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  racsTimerLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000",
  },
  racsTimerValue: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  buttonGroupConfirm: {
    width: "100%",
    gap: 15,
    marginTop: 16,
  },
  racsSeparator: {
    height: 1,
    width: "100%",
    marginVertical: 4,
  },
  buttonConfirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    borderColor: "#007BFF",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderColor: "#007BFF",

    borderWidth: 2,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    textTransform: "uppercase",
    lineHeight: 22,
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: false,
    color: "#007BFF",
  },
  resumeText: {
    color: "black",
  },
  stopText: {
    color: "#d9534f",
  },
  deathText: {
    color: "#333",
  },
  ecgSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  ecgButton: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  ecgInner: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  ecgTimer: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  ecgLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    textTransform: "uppercase",
    marginTop: 4,
  },
});
