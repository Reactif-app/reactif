import { sessionController } from "@/controllers/SessionController";
import { sessionStore } from "@/store/sessionStore";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface ShockTimerProps {
  onShock: () => void;
  onAnalysis: () => void;
  onCancelLastShock?: () => boolean;
  isActive?: boolean;
  lastShockTime?: number | null;
  lastAnalysisTime?: number | null;
  durationSeconds?: number;
  warningSeconds?: number;
  shockCount?: number;
  resetRequest?: {
    token: number;
    target: "shockTimer" | "cordarone" | "adrenaline" | "remplissage" | null;
    sourceEventType?:
      | "shock"
      | "analysis"
      | "cordarone"
      | "adrenaline"
      | "event"
      | null;
  };
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export default function ShockTimer({
  onShock,
  onAnalysis,
  onCancelLastShock,
  isActive = true,
  lastShockTime,
  lastAnalysisTime,
  durationSeconds = 120, // default override later
  warningSeconds = 10,
  shockCount = 0,
  resetRequest,
}: ShockTimerProps) {
  const cprMode = sessionStore.getSession()?.mode || "adult";
  const isNeonatal = cprMode === "neonatal";
  const effectiveDurationSeconds = isNeonatal ? 30 : durationSeconds;

  const { width } = useWindowDimensions();
  const [timeLeft, setTimeLeft] = useState(effectiveDurationSeconds);
  const [localStartTime, setLocalStartTime] = useState<number | null>(null);

  const [scaleAnim] = useState(() => new Animated.Value(1));
  const soundPlayedRef = useRef(false);
  const firstReminderPlayedRef = useRef(false);
  const midReminderPlayedRef = useRef(false);
  const blinkingRef = useRef<Animated.CompositeAnimation | null>(null);

  const [shockBounceAnim] = useState(() => new Animated.Value(1));
  const [analysisBounceAnim] = useState(() => new Animated.Value(1));

  const availableWidth = width - 32 - 20;
  const circleSize = Math.min((availableWidth - 20) / 2, 170);

  const size = circleSize;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const innerSize = size - 45;
  const innerRadius = innerSize / 2;

  const effectiveStartTime = localStartTime ?? lastShockTime;
  const [localShockCount, setLocalShockCount] = useState<number>(
    shockCount || 0,
  );

  const [localLastAnalysisTime, setLocalLastAnalysisTime] = useState<
    number | null
  >(null);
  const [analysisSuppressedByShock, setAnalysisSuppressedByShock] =
    useState(false);
  const effectiveAnalysisStart = localLastAnalysisTime ?? lastAnalysisTime;

  const [theme, setTheme] = useState(sessionStore.theme);
  const [energyDose, setEnergyDose] = useState<string | null>(
    sessionStore.getPediatricData()?.energyDose ?? null,
  );

  const startBlinking = useCallback(() => {
    if (blinkingRef.current) return;

    blinkingRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    blinkingRef.current.start();
  }, [scaleAnim]);

  const stopBlinking = useCallback(() => {
    if (blinkingRef.current) {
      blinkingRef.current.stop();
      blinkingRef.current = null;
    }
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    if (!isActive) return;

    // If there's no start time for shock or analysis, show full duration
    if (!effectiveStartTime && !effectiveAnalysisStart) {
      queueMicrotask(() => setTimeLeft(effectiveDurationSeconds));
      stopBlinking();
      scaleAnim.setValue(1);
      soundPlayedRef.current = false;
      firstReminderPlayedRef.current = false;
      midReminderPlayedRef.current = false;
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (
        !analysisSuppressedByShock &&
        effectiveAnalysisStart &&
        (!lastShockTime || effectiveAnalysisStart > lastShockTime || isNeonatal)
      ) {
        const elapsedAnalysis = Math.floor(
          (now - effectiveAnalysisStart) / 1000,
        );
        const remainingAnalysis = Math.max(
          0,
          effectiveDurationSeconds - elapsedAnalysis,
        );
        setTimeLeft(remainingAnalysis);
        return;
      } else if (!isNeonatal && (lastShockTime || effectiveStartTime)) {
        const shockBase = lastShockTime ?? effectiveStartTime;
        if (!shockBase) {
          setTimeLeft(effectiveDurationSeconds);
          return;
        }
        const elapsedShock = Math.floor((now - shockBase) / 1000);
        const remainingShock = Math.max(0, effectiveDurationSeconds - elapsedShock);
        setTimeLeft(remainingShock);
        return;
      }
      setTimeLeft(effectiveDurationSeconds);
    };

    queueMicrotask(updateTimer);
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    effectiveDurationSeconds,
    isActive,
    isNeonatal,
    effectiveStartTime,
    effectiveAnalysisStart,
    analysisSuppressedByShock,
    durationSeconds,
    lastShockTime,
    scaleAnim,
    stopBlinking,
  ]);

  useEffect(() => {
    // Sync local state if prop updates (e.g. shock delivered or cancelled)
    queueMicrotask(() => {
      setLocalStartTime(null);
      // Keep localShockCount in sync with prop updates
      setLocalShockCount(shockCount || 0);
    });
  }, [lastShockTime, shockCount]);

  useEffect(() => {
    // Keep pediatric energy and theme in sync with the store
    return sessionStore.subscribe(() => {
      setEnergyDose(sessionStore.getPediatricData()?.energyDose ?? null);
      setTheme(sessionStore.theme);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLocalLastAnalysisTime(null);
      setAnalysisSuppressedByShock(false);
    });
  }, [lastAnalysisTime]);

  useEffect(() => {
    // Once store catches up with a persisted shock timestamp, normal precedence logic is enough.
    queueMicrotask(() => setAnalysisSuppressedByShock(false));
  }, [lastShockTime]);

  // Reset this timer only when cancel targets the shock/analyse timer
  useEffect(() => {
    if (!resetRequest || resetRequest.target !== "shockTimer") return;

    queueMicrotask(() => {
      setLocalStartTime(null);
      setLocalLastAnalysisTime(null);
      if (resetRequest.sourceEventType === "shock") {
        setLocalShockCount((c) => Math.max(0, c - 1));
      }
      setTimeLeft(effectiveDurationSeconds);
    });
    stopBlinking();
    scaleAnim.setValue(1);
    soundPlayedRef.current = false;
    firstReminderPlayedRef.current = false;
    midReminderPlayedRef.current = false;
  }, [
    durationSeconds,
    effectiveDurationSeconds,
    resetRequest,
    scaleAnim,
    stopBlinking,
  ]);

  const midpointWarning = Math.max(1, Math.floor(warningSeconds / 2));

  useEffect(() => {
    if (!isActive) {
      stopBlinking();
      return;
    }

    if (timeLeft === 0) {
      if (!soundPlayedRef.current) {
        sessionController.playReminderPattern("end", "shock");
        soundPlayedRef.current = true;
      }
      startBlinking();
    } else {
      if (
        warningSeconds > 0 &&
        timeLeft === warningSeconds &&
        !firstReminderPlayedRef.current
      ) {
        sessionController.playReminderPattern("first", "shock");
        firstReminderPlayedRef.current = true;
      }

      if (
        warningSeconds > 1 &&
        timeLeft === midpointWarning &&
        timeLeft < warningSeconds &&
        !midReminderPlayedRef.current
      ) {
        sessionController.playReminderPattern("mid", "shock");
        midReminderPlayedRef.current = true;
      }

      stopBlinking();
      if (timeLeft > 0) {
        soundPlayedRef.current = false;
      }
      if (timeLeft > warningSeconds) {
        firstReminderPlayedRef.current = false;
        midReminderPlayedRef.current = false;
      }
    }
  }, [isActive, midpointWarning, startBlinking, stopBlinking, timeLeft, warningSeconds]);

  const handleShockPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopBlinking();
    soundPlayedRef.current = false;
    firstReminderPlayedRef.current = false;
    midReminderPlayedRef.current = false;

    const now = Date.now();
    setLocalStartTime(now);
    setLocalShockCount((c) => c + 1);
    setLocalLastAnalysisTime(null);
    setAnalysisSuppressedByShock(true);
    setTimeLeft(effectiveDurationSeconds);
    onShock();
  };

  const handleAnalysisPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopBlinking();
    soundPlayedRef.current = false;
    firstReminderPlayedRef.current = false;
    midReminderPlayedRef.current = false;

    const now = Date.now();
    setAnalysisSuppressedByShock(false);
    setLocalLastAnalysisTime(now);
    setTimeLeft(effectiveDurationSeconds);
    onAnalysis();
  };

  const handleShockBadgePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!onCancelLastShock) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancelLastShock();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = effectiveDurationSeconds > 0 ? timeLeft / effectiveDurationSeconds : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      {!isNeonatal && (
        <AnimatedTouchableOpacity
          onPress={handleShockPress}
          onPressIn={() => {
            Animated.timing(shockBounceAnim, {
              toValue: 0.95,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.timing(shockBounceAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }}
          activeOpacity={0.8}
          style={{
            transform: [{ scale: Animated.multiply(scaleAnim, shockBounceAnim) }],
          }}
        >
          <View
            style={[
              styles.buttonCircle,
              {
                width: circleSize - 6,
                height: circleSize - 6,
                borderRadius: (circleSize - 6) / 2,
              },
              theme === "dark"
                ? { backgroundColor: "#353636" }
                : { backgroundColor: "#F5F5F5" },
            ]}
          >
            <Ionicons
              name="flash"
              size={40}
              color={theme === "dark" ? "#FFFF" : "#000"}
            />
            <Text
              style={[
                styles.labelText,
                { color: theme === "dark" ? "#FFFF" : "#000" },
              ]}
            >
              CHOC
            </Text>
            {energyDose ? (
              <Text style={styles.energyText}>{energyDose}J</Text>
            ) : null}
            {localShockCount > 0 ? (
              <TouchableOpacity
                style={styles.badge}
                onPress={handleShockBadgePress}
                activeOpacity={0.85}
              >
                <Text style={styles.badgeText}>{localShockCount}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </AnimatedTouchableOpacity>
      )}

      <AnimatedTouchableOpacity
        onPress={handleAnalysisPress}
        activeOpacity={0.8}
        onPressIn={() => {
          Animated.timing(analysisBounceAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.timing(analysisBounceAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }}
        style={[
          styles.svgContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, analysisBounceAnim) },
            ],
          },
          { width: circleSize, height: circleSize },
        ]}
      >
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#f5dd4b"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#FF5252"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
        <View
          style={[
            styles.innerContent,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerRadius,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="heart-pulse"
            size={40}
            style={[
              theme === "dark"
                ? { color: "#fff", marginBottom: 4 }
                : { color: "#000", marginBottom: 4 },
            ]}
          />

          <Text
            style={[
              styles.labelText,
              theme === "dark" ? { color: "#FFFF" } : { color: "#000" },
            ]}
          >
            {isNeonatal ? "ANALYSE FC" : "ANALYSE"}
          </Text>
          <Text
            style={[
              styles.timerText,
              theme === "dark" ? { color: "#FFFF" } : { color: "#000" },
            ]}
          >
            {formatTime(timeLeft)}
          </Text>
        </View>
      </AnimatedTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
    gap: 16,
  },
  buttonCircle: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 12,
    borderColor: "#FF5252", // Outline color for button
  },
  svgContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
  labelText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    textTransform: "uppercase",
    textAlign: "center",
    alignSelf: "stretch",
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    top: 15,
    right: 25,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 1984,
    backgroundColor: "#FF5252",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  pediatricHint: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  energyText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
});
