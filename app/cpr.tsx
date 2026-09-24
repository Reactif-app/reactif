import { useFocusEffect, useIsFocused } from "expo-router/react-navigation";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActionButtons from "@/components/ActionButtons";
import ActionProgressBar from "@/components/ActionProgressBar";
import CprTimer from "@/components/CprTimer";
import EventSelectionModal from "@/components/EventSelectionModal";
import MetronomeControl from "@/components/MetronomeControl";
import ShockTimer from "@/components/ShockTimer";
import { useCprSettings } from "@/hooks/useCprSettings";
import { sessionStore } from "@/store/sessionStore";

import { metronomeController } from "@/controllers/MetronomeController";
import { sessionController } from "@/controllers/SessionController";
import { t } from "@/i18n";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type ResetTarget = "shockTimer" | "cordarone" | "adrenaline";

interface CancelResetRequest {
  token: number;
  target: ResetTarget | "remplissage" | null;
  sourceEventType: "shock" | "analysis" | "cordarone" | "adrenaline" | "event" | null;
}

export default function Cpr() {
  const router = useRouter();
  const {
    shockDuration,
    cordaroneDuration,
    adrenalineDuration,
    warningSeconds,
    endButtonShortTap,
  } = useCprSettings();

  // ---- Dark Mode State ----
  const [theme, setTheme] = useState(sessionStore.theme);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  // ----- Metronome State & Logic -----
  const [bpm, setBpm] = useState(100);
  const [isMuted, setIsMuted] = useState(true);
  const isScreenActive = useIsFocused();

  const cprMode = sessionStore.getSession()?.mode || "adult";

  const [doses, setDoses] = useState({
    adrenaline: sessionStore.getAdrenalineDose(),
    cordarone: sessionStore.getCordaroneDose(),
    energy: sessionStore.getEnergyDose(),
  });

  // Re-render when controller notifies so controller getters update
  const [, setControllerTick] = useState(0);
  useEffect(() => {
    const unsubscribe = sessionController.subscribe(() => {
      setControllerTick((t) => t + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to session store to stop metronome on definitive end and update doses
  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      const currentSession = sessionStore.getSession();
      if (currentSession?.endTime) {
        setIsMuted(true);
        metronomeController.setMuted(true);
      }
      setDoses({
        adrenaline: sessionStore.getAdrenalineDose(),
        cordarone: sessionStore.getCordaroneDose(),
        energy: sessionStore.getEnergyDose(),
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Update shared values
  useEffect(() => {
    metronomeController.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    metronomeController.setMuted(isMuted);
  }, [isMuted]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(false, "none");
      metronomeController.setBpm(bpm);
      if (!isMuted) {
        void metronomeController.start();
      }

      return () => {
        StatusBar.setHidden(false, "none");
        metronomeController.stop();
        void sessionController.stopAllSounds();
      };
    }, [bpm, isMuted]),
  );

  useFocusEffect(
    useCallback(() => {
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

  // metronomeController handles timing and sound

  const getLastResumeTimestamp = () => {
    const events = sessionStore.getSession()?.events || [];
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (
        event.type === "event" &&
        String(event.details || "").toUpperCase() === "RESUME"
      ) {
        return event.timestamp;
      }
    }
    return null;
  };

  const getLastTimeSinceResume = (
    type: "shock" | "analysis" | "cordarone" | "adrenaline",
  ) => {
    const events = sessionStore.getSession()?.events || [];
    const resumeTs = getLastResumeTimestamp();
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (event.type !== type) continue;
      if (resumeTs && event.timestamp <= resumeTs) {
        return null;
      }
      return event.timestamp;
    }
    return null;
  };

  const shockCount = sessionController.getCount("shock");
  const lastShockTime = getLastTimeSinceResume("shock");
  const lastAnalysisTime = getLastTimeSinceResume("analysis");
  // Local UI state for medication counts and last timestamps so React updates reliably
  const [cordaroneCountState, setCordaroneCountState] = useState(
    sessionController.getCount("cordarone"),
  );
  const [adrenalineCountState, setAdrenalineCountState] = useState(
    sessionController.getCount("adrenaline"),
  );
  const [lastCordaroneTimeState, setLastCordaroneTimeState] = useState<
    number | null
  >(getLastTimeSinceResume("cordarone"));
  const [lastAdrenalineTimeState, setLastAdrenalineTimeState] = useState<
    number | null
  >(getLastTimeSinceResume("adrenaline"));

  // Keep these derived values in sync with the session store when controller notifies
  useEffect(() => {
    const updateFromStore = () => {
      const events = sessionStore.getSession()?.events || [];
      const resumeTs = getLastResumeTimestamp();
      const cordEvents = events.filter((e) => e.type === "cordarone");
      const adrEvents = events.filter((e) => e.type === "adrenaline");
      const cordEventsSinceResume = resumeTs
        ? cordEvents.filter((e) => e.timestamp > resumeTs)
        : cordEvents;
      const adrEventsSinceResume = resumeTs
        ? adrEvents.filter((e) => e.timestamp > resumeTs)
        : adrEvents;

      setCordaroneCountState(cordEvents.length);
      setAdrenalineCountState(adrEvents.length);
      setLastCordaroneTimeState(
        cordEventsSinceResume.length
          ? cordEventsSinceResume[cordEventsSinceResume.length - 1].timestamp
          : null,
      );
      setLastAdrenalineTimeState(
        adrEventsSinceResume.length
          ? adrEventsSinceResume[adrEventsSinceResume.length - 1].timestamp
          : null,
      );
    };

    // initialize once
    updateFromStore();
    const unsubscribe = sessionController.subscribe(() => {
      updateFromStore();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const cordaroneCount = cordaroneCountState;
  const adrenalineCount = adrenalineCountState;

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [cancelResetRequest, setCancelResetRequest] =
    useState<CancelResetRequest>({
      token: 0,
      target: null,
      sourceEventType: null,
    });

  const handleEnd = () => {
    setIsMuted(true);
    metronomeController.setMuted(true);
    void sessionController.stopAllSounds();
    // Navigate to End Cpr flow
    router.push("/cprEndFirstPage" as any);
  };
  const handleEvent = () => setModalVisible(true);

  const handleSaveEvents = (selectedEvents: string[]) => {
    sessionController.logEvents(selectedEvents);
  };

  const handleOpenAideCognitive = () => {
    router.push("/aideCognitive" as any);
  };

  const handleCancel = () => {
    const lastEvent = sessionStore.getSession()?.events.at(-1);
    const lastEventType = lastEvent?.type;
    let target: ResetTarget | "remplissage" | null = null;

    if (lastEventType === "shock" || lastEventType === "analysis") {
      target = "shockTimer";
    }
    if (lastEventType === "cordarone") {
      target = "cordarone";
    }
    if (lastEventType === "adrenaline") {
      target = "adrenaline";
    }
    if (lastEventType === "event" && lastEvent?.details === "REMPLISSAGE") {
      target = "remplissage";
    }

    sessionController.cancelLast();
    setCancelResetRequest((prev) => ({
      token: prev.token + 1,
      target,
      sourceEventType:
        lastEventType === "shock" ||
        lastEventType === "analysis" ||
        lastEventType === "cordarone" ||
        lastEventType === "adrenaline" ||
        lastEventType === "event"
          ? lastEventType
          : null,
    }));
  };

  const handleCancelLastShock = () => {
    const removed = sessionController.cancelLastOfType("shock");
    if (!removed) return false;
    setCancelResetRequest((prev) => ({
      token: prev.token + 1,
      target: "shockTimer",
      sourceEventType: "shock",
    }));
    return true;
  };

  return (
    <SafeAreaView
      style={[
        { flex: 1, backgroundColor: "#fff" },
        theme === "dark" ? { backgroundColor: "#353636" } : {},
      ]}
    >
      <View style={styles.container}>
        {/* Top Timer */}
        <CprTimer />

        {/* Shock Circular Timer */}
        {/* Pass shockDuration from settings */}
        <View style={styles.shockRow}>
          <ShockTimer
            onShock={sessionController.logShock}
            onAnalysis={sessionController.logAnalysis}
            onCancelLastShock={handleCancelLastShock}
            lastShockTime={lastShockTime}
            lastAnalysisTime={lastAnalysisTime}
            durationSeconds={shockDuration}
            shockCount={shockCount}
            resetRequest={cancelResetRequest}
            warningSeconds={warningSeconds}
          />
        </View>

        {/* Action Progress Bars */}
        <View style={styles.actionsContainer}>
          <ActionProgressBar
            label={t("session.adrenaline")}
            count={adrenalineCount}
            color="#448AFF"
            icon={<FontAwesome5 name="syringe" size={24} />}
            onPress={sessionController.logAdrenaline}
            lastActionTime={lastAdrenalineTimeState}
            durationSeconds={adrenalineDuration} // Use setting
            subtitle={
              cprMode === "neonatal"
                ? "10 à 30 µg/kg"
                : doses.adrenaline
                  ? `${doses.adrenaline} mg`
                  : undefined
            }
            resetRequest={cancelResetRequest}
            resetKey="adrenaline"
            warningSeconds={warningSeconds}
            isActive={isScreenActive}
          />

          {cprMode !== "neonatal" ? (
            <ActionProgressBar
              label={t("session.cordarone")}
              count={cordaroneCount}
              color="#448AFF"
              icon={<FontAwesome5 name="syringe" size={24} />}
              onPress={sessionController.logCordarone}
              lastActionTime={lastCordaroneTimeState}
              durationSeconds={cordaroneDuration} // Use setting
              subtitle={doses.cordarone ? `${doses.cordarone} mg` : undefined}
              resetRequest={cancelResetRequest}
              resetKey="cordarone"
              warningSeconds={warningSeconds}
              isActive={isScreenActive}
            />
          ) : (
            <ActionProgressBar
              label={t("events.options.fillingTransfusion")}
              count={sessionController.getCount("remplissage")}
              color="#448AFF"
              icon={<FontAwesome5 name="tint" size={24} />}
              onPress={() => sessionController.logRemplissage()}
              lastActionTime={null} /* no timer */
              durationSeconds={0}
              subtitle="10 mL/kg"
              resetRequest={cancelResetRequest}
              resetKey="remplissage"
              warningSeconds={warningSeconds}
              isActive={isScreenActive}
            />
          )}
        </View>

        {/* Action Buttons Grid */}
        <ActionButtons
          onEnd={handleEnd}
          onEvent={handleEvent}
          onAideCognitive={handleOpenAideCognitive}
          onCancel={handleCancel}
          useShortTapEndButton={endButtonShortTap}
        />

        {/* Metronome */}
        <MetronomeControl
          bpm={bpm}
          setBpm={setBpm}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />

        <EventSelectionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveEvents}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    gap: 5,
  },
  actionsContainer: {
    flexDirection: "column",
    width: "100%",
    gap: 16,
    justifyContent: "center",
  },
  shockRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
