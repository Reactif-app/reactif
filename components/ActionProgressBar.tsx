import { sessionController } from "@/controllers/SessionController";
import { sessionStore } from "@/store/sessionStore";
import { formatSecondsToClock } from "@/utils/sessionUtils";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ActionProgressBarProps {
  label: string;
  count: number;
  color: string;
  isActive?: boolean;
  icon?: React.ReactElement;
  onPress: () => void;
  lastActionTime?: number | null;
  durationSeconds?: number;
  warningSeconds?: number;
  subtitle?: string;
  resetRequest?: {
    token: number;
    target: "shockTimer" | "cordarone" | "adrenaline" | "remplissage" | null;
  };
  resetKey?: "cordarone" | "adrenaline" | "remplissage";
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const BAR_HEIGHT = 66;
const BADGE_SIZE = BAR_HEIGHT;

export default function ActionProgressBar({
  label,
  count,
  color,
  isActive = true,
  icon,
  onPress,
  lastActionTime,
  durationSeconds = 120,
  warningSeconds = 10,
  subtitle,
  resetRequest,
  resetKey,
}: ActionProgressBarProps) {
  const [theme, setTheme] = useState(sessionStore.theme);
  const [elapsed, setElapsed] = useState(0);
  const [width, setWidth] = useState(0);
  const [localLastActionTime, setLocalLastActionTime] = useState<number | null>(
    null,
  );

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const soundPlayedRef = useRef(false);
  const firstReminderPlayedRef = useRef(false);
  const midReminderPlayedRef = useRef(false);
  const blinkingRef = useRef<Animated.CompositeAnimation | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const effectiveLast = lastActionTime ?? localLastActionTime;

    if (!effectiveLast) {
      setElapsed(0);
      soundPlayedRef.current = false;
      firstReminderPlayedRef.current = false;
      midReminderPlayedRef.current = false;
      stopBlinking();
      return;
    }

    const updateElapsed = () => {
      const current = Date.now();
      const diff = Math.floor((current - effectiveLast) / 1000);
      setElapsed(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isActive, lastActionTime, localLastActionTime]);

  useEffect(() => {
    setLocalLastActionTime(null);
  }, [lastActionTime]);

  // Reset only when cancel targets this specific medication timer
  useEffect(() => {
    if (!resetRequest || !resetKey || resetRequest.target !== resetKey) return;
    setLocalLastActionTime(null);
    setElapsed(0);
    soundPlayedRef.current = false;
    firstReminderPlayedRef.current = false;
    midReminderPlayedRef.current = false;
    stopBlinking();
  }, [resetRequest, resetKey]);

  const hasTimer = durationSeconds > 0;
  const timeLeft = Math.max(0, durationSeconds - elapsed);
  const isExpired = hasTimer && elapsed >= durationSeconds;
  const midpointWarning = Math.max(1, Math.floor(warningSeconds / 2));
  const reminderSoundKind = resetKey === "remplissage" ? undefined : resetKey;

  useEffect(() => {
    if (!isActive) {
      stopBlinking();
      return;
    }

    // Prevent Cordarone from blinking after 2 uses
    const isCordarone = resetKey === "cordarone";
    if (isCordarone && count >= 2) {
      stopBlinking();
      return;
    }

    if (isExpired) {
      if (!soundPlayedRef.current) {
        sessionController.playReminderPattern("end", reminderSoundKind);
        triggerHaptic();
        soundPlayedRef.current = true;
      }
      startBlinking();
    } else {
      if (
        warningSeconds > 0 &&
        timeLeft === warningSeconds &&
        !firstReminderPlayedRef.current
      ) {
        sessionController.playReminderPattern("first", reminderSoundKind);
        firstReminderPlayedRef.current = true;
      }

      if (
        warningSeconds > 1 &&
        timeLeft === midpointWarning &&
        timeLeft < warningSeconds &&
        !midReminderPlayedRef.current
      ) {
        sessionController.playReminderPattern("mid", reminderSoundKind);
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
  }, [
    isActive,
    isExpired,
    midpointWarning,
    timeLeft,
    warningSeconds,
    count,
    resetKey,
    reminderSoundKind,
  ]);

  const triggerHaptic = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const startBlinking = () => {
    if (blinkingRef.current) return; // Already blinking

    blinkingRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    blinkingRef.current.start();
  };

  const stopBlinking = () => {
    if (blinkingRef.current) {
      blinkingRef.current.stop();
      blinkingRef.current = null;
    }
    Animated.timing(blinkAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(blinkAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    stopBlinking();
    soundPlayedRef.current = false;
    firstReminderPlayedRef.current = false;
    midReminderPlayedRef.current = false;

    onPress();
    setLocalLastActionTime(Date.now());
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, hasTimer ? (timeLeft / durationSeconds) * 100 : 100),
  );
  const timeLeftText = hasTimer ? formatSecondsToClock(timeLeft) : "";

  return (
    <View style={styles.buttonContainer}>
      <AnimatedTouchableOpacity
        onPressIn={() => {
          Animated.timing(bounceAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }}
        onPress={handlePress}
        activeOpacity={0.8}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[
          styles.container,
          {
            opacity: blinkAnim,
            transform: [{ scale: bounceAnim }],
            backgroundColor: isDark ? "#1f2937" : "#fff",
            borderColor: color,
          },
        ]}
      >
        {/* First layer */}
        <View style={[styles.layer]}>
          <View style={styles.content}>
            {icon && React.cloneElement(icon, { color: "#fff" } as any)}
            <View
              style={[
                styles.labelContainer,
                !subtitle ? styles.labelContainerCenter : undefined,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color },
                  !subtitle ? styles.labelCenter : undefined,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {label}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color }]}>{subtitle}</Text>
              ) : null}
            </View>
            {hasTimer && <Text style={[styles.timerRight, { color }]}>{timeLeftText}</Text>}
          </View>
        </View>

        {/* Second layer */}
        <View
          style={[
            styles.layer,
            {
              width: `${progressPercent}%`,
              backgroundColor: color,
              overflow: "hidden",
            },
          ]}
        >
          <View style={[styles.content, { width: width - 7 }]}>
            {icon && React.cloneElement(icon, { color: "#fff" } as any)}
            <View
              style={[
                styles.labelContainer,
                !subtitle ? styles.labelContainerCenter : undefined,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: "#fff" },
                  !subtitle ? styles.labelCenter : undefined,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {label}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: "#fff" }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {hasTimer && <Text style={styles.timerRight}>{timeLeftText}</Text>}
          </View>
        </View>
      </AnimatedTouchableOpacity>

      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.badgeText, { color: color }]}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  container: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 2,
    position: "relative",
    justifyContent: "center",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,

    borderWidth: 0,
    borderColor: "#fff",
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
    width: 24,
    textAlign: "center",
  },
  labelContainer: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 10,
  },
  labelContainerCenter: {
    alignItems: "center",
    paddingLeft: 0,
  },
  label: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "left",
  },
  labelCenter: {
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "left",
    fontWeight: "normal",
  },
  timerRight: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    minWidth: 78,
    textAlign: "right",
  },
  badge: {
    borderWidth: 2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    minWidth: BADGE_SIZE,
    maxWidth: BADGE_SIZE,
    minHeight: BADGE_SIZE,
    maxHeight: BADGE_SIZE,
    borderRadius: 1000,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
