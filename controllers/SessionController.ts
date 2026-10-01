import { CprEvent } from "@/models/session";
import { sessionStore } from "@/store/sessionStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { SoundController, SoundName, soundController } from "./SoundController";
import { TimerSoundKind } from "@/utils/soundChoices";

const STORAGE_KEY_PREVIEW_MAX_VOLUME = "@cpr_settings_preview_max_volume";

export class SessionController {
  constructor(
    private readonly audioController: SoundController = soundController,
  ) {
    // Forward session store updates to controller subscribers
    sessionStore.subscribe(() => this.notify());
  }
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private pushLog(log: CprEvent) {
    if (log.type === "event") {
      sessionStore.logEvent("event", log.details);
    } else {
      sessionStore.logEvent(log.type);
    }
    this.notify();
  }

  async playSound(name: SoundName) {
    try {
      await this.audioController.play(name);
    } catch {
      // ignore
    }
  }

  async initAudioAtMaxVolume() {
    try {
      await this.audioController.setVolume(1);

      if (Platform.OS !== "android") return;
      const previewMaxVolume =
        (await AsyncStorage.getItem(STORAGE_KEY_PREVIEW_MAX_VOLUME)) === "true";
      if (!previewMaxVolume) return;

      // Optional native module used only in custom Android builds.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const volumeManagerModule = require("react-native-volume-manager");
      const VolumeManager = volumeManagerModule?.VolumeManager;
      if (!VolumeManager?.setVolume) return;

      await VolumeManager.setVolume(1, {
        type: "music",
        showUI: false,
        playSound: false,
      });
    } catch {
      // ignore
    }
  }

  async playReminderPattern(
    kind: "first" | "mid" | "end",
    timerKind?: TimerSoundKind,
  ) {
    try {
      await this.audioController.playReminderPattern(kind, timerKind);
    } catch {
      // ignore
    }
  }

  async stopAllSounds() {
    try {
      await this.audioController.stopAll();
    } catch {
      // ignore
    }
  }

  startSession = () => {
    sessionStore.startNewSession();
  };

  logShock = () => {
    this.pushLog({ type: "shock", timestamp: Date.now() });
  };

  logAnalysis = () => {
    this.pushLog({ type: "analysis", timestamp: Date.now() });
  };

  logCordarone = () => {
    this.pushLog({ type: "cordarone", timestamp: Date.now() });
  };

  logAdrenaline = () => {
    this.pushLog({ type: "adrenaline", timestamp: Date.now() });
  };

  logRemplissage = () => {
    this.pushLog({ type: "event", timestamp: Date.now(), details: "REMPLISSAGE" });
  };

  logEvents = (events: string[]) => {
    const now = Date.now();
    events.forEach((event) =>
      this.pushLog({ type: "event", timestamp: now, details: event }),
    );
  };

  cancelLast = () => {
    sessionStore.cancelLast();
  };

  cancelLastOfType = (type: CprEvent["type"]) => {
    return sessionStore.cancelLastOfType(type);
  };

  getCount = (type: CprEvent["type"] | "remplissage") => {
    if (type === "remplissage") {
      return (
        sessionStore.getSession()?.events.filter((l) => l.type === "event" && l.details === "REMPLISSAGE").length || 0
      );
    }
    return (
      sessionStore.getSession()?.events.filter((l) => l.type === type).length ||
      0
    );
  };

  // Get the time stamp of the last event of a type
  getLastTime(type: CprEvent["type"]) {
    const relevant = sessionStore
      .getSession()
      ?.events.filter((l) => l.type === type);
    return relevant && relevant.length
      ? relevant[relevant.length - 1].timestamp
      : null;
  }
  async endSession() {
    await sessionStore.saveCurrentSession();
  }
}

export const sessionController = new SessionController();
