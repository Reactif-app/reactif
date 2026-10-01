import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { soundController } from "@/controllers/SoundController";

const STORAGE_KEY_SHOCK = "@cpr_settings_shock_duration";
const STORAGE_KEY_CORDARONE = "@cpr_settings_cordarone_duration";
const STORAGE_KEY_ADRENALINE = "@cpr_settings_adrenaline_duration";
const STORAGE_KEY_WARNING = "@cpr_settings_warning_seconds";
const STORAGE_KEY_END_BUTTON_SHORT_TAP = "@cpr_settings_end_button_short_tap";
const STORAGE_KEY_PREVIEW_MAX_VOLUME = "@cpr_settings_preview_max_volume";

export const DEFAULT_SHOCK_DURATION = 120;
export const DEFAULT_CORDARONE_DURATION = 4 * 60;
export const DEFAULT_ADRENALINE_DURATION = 240;
export const DEFAULT_WARNING_SECONDS = 10;

export interface CprSettings {
  shockDuration: number;
  cordaroneDuration: number;
  adrenalineDuration: number;
  warningSeconds: number;
  endButtonShortTap: boolean;
  previewMaxVolume: boolean;
  loading: boolean;
  updateSettings: (
    key: "shock" | "cordarone" | "adrenaline" | "warning",
    value: number,
  ) => Promise<void>;
  setEndButtonShortTap: (enabled: boolean) => Promise<void>;
  setPreviewMaxVolume: (enabled: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useCprSettings(): CprSettings {
  const [shockDuration, setShockDuration] = useState(DEFAULT_SHOCK_DURATION);
  const [cordaroneDuration, setCordaroneDuration] = useState(
    DEFAULT_CORDARONE_DURATION,
  );
  const [adrenalineDuration, setAdrenalineDuration] = useState(
    DEFAULT_ADRENALINE_DURATION,
  );
  const [warningSeconds, setWarningSeconds] = useState(DEFAULT_WARNING_SECONDS);
  const [endButtonShortTap, setEndButtonShortTapState] = useState(false);
  const [previewMaxVolume, setPreviewMaxVolumeState] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const [shock, adrenaline, warning, endButtonMode, preview] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SHOCK),
          AsyncStorage.getItem(STORAGE_KEY_ADRENALINE),
          AsyncStorage.getItem(STORAGE_KEY_WARNING),
          AsyncStorage.getItem(STORAGE_KEY_END_BUTTON_SHORT_TAP),
          AsyncStorage.getItem(STORAGE_KEY_PREVIEW_MAX_VOLUME),
        ]);

      if (shock) setShockDuration(parseInt(shock, 10));
      // Cordarone is intentionally fixed to the default value.
      setCordaroneDuration(DEFAULT_CORDARONE_DURATION);
      // Clean up any legacy persisted value from previous app versions.
      await AsyncStorage.removeItem(STORAGE_KEY_CORDARONE);
      if (adrenaline) setAdrenalineDuration(parseInt(adrenaline, 10));
      if (warning) setWarningSeconds(parseInt(warning, 10));
      if (endButtonMode) setEndButtonShortTapState(endButtonMode === "true");
      if (preview) setPreviewMaxVolumeState(preview === "true");
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      queueMicrotask(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const setEndButtonShortTap = async (enabled: boolean) => {
    try {
      setEndButtonShortTapState(enabled);
      await AsyncStorage.setItem(
        STORAGE_KEY_END_BUTTON_SHORT_TAP,
        enabled ? "true" : "false",
      );
    } catch (e) {
      console.error("Failed to save end button mode", e);
    }
  };

  const setPreviewMaxVolume = async (enabled: boolean) => {
    try {
      setPreviewMaxVolumeState(enabled);
      await AsyncStorage.setItem(
        STORAGE_KEY_PREVIEW_MAX_VOLUME,
        enabled ? "true" : "false",
      );
    } catch (e) {
      console.error("Failed to save preview max volume mode", e);
    }
  };

  const updateSettings = async (
    key: "shock" | "cordarone" | "adrenaline" | "warning",
    value: number,
  ) => {
    try {
      if (key === "shock") {
        setShockDuration(value);
        await AsyncStorage.setItem(STORAGE_KEY_SHOCK, value.toString());
      } else if (key === "cordarone") {
        setCordaroneDuration(DEFAULT_CORDARONE_DURATION);
        await AsyncStorage.removeItem(STORAGE_KEY_CORDARONE);
      } else if (key === "adrenaline") {
        setAdrenalineDuration(value);
        await AsyncStorage.setItem(STORAGE_KEY_ADRENALINE, value.toString());
      } else if (key === "warning") {
        const normalized = Math.max(1, Math.floor(value));
        setWarningSeconds(normalized);
        await AsyncStorage.setItem(STORAGE_KEY_WARNING, normalized.toString());
      }
    } catch (e) {
      console.error("Failed to save setting", key, e);
    }
  };

  const resetSettings = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_SHOCK,
        STORAGE_KEY_CORDARONE,
        STORAGE_KEY_ADRENALINE,
        STORAGE_KEY_WARNING,
        STORAGE_KEY_END_BUTTON_SHORT_TAP,
        STORAGE_KEY_PREVIEW_MAX_VOLUME,
      ]);
      setShockDuration(DEFAULT_SHOCK_DURATION);
      setCordaroneDuration(DEFAULT_CORDARONE_DURATION);
      setAdrenalineDuration(DEFAULT_ADRENALINE_DURATION);
      setWarningSeconds(DEFAULT_WARNING_SECONDS);
      setEndButtonShortTapState(false);
      setPreviewMaxVolumeState(false);
      await soundController.resetSoundChoices();
    } catch (e) {
      console.error("Failed to reset settings", e);
    }
  };

  return {
    shockDuration,
    cordaroneDuration,
    adrenalineDuration,
    warningSeconds,
    endButtonShortTap,
    previewMaxVolume,
    loading,
    updateSettings,
    setEndButtonShortTap,
    setPreviewMaxVolume,
    resetSettings,
  };
}
