import { useCallback, useEffect, useState } from "react";

import {
  getLocale,
  getLocalePreference,
  setLocale,
  setLocalePreference,
  subscribeLocale,
  syncLocaleWithDeviceSettings,
  t,
  type Locale,
  type LocalePreference,
} from "@/i18n";

export const useI18n = () => {
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  const [localePreference, setLocalePreferenceState] =
    useState<LocalePreference>(getLocalePreference());

  const refreshLocale = useCallback(() => {
    setLocaleState(getLocale());
    setLocalePreferenceState(getLocalePreference());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLocale(refreshLocale);
    syncLocaleWithDeviceSettings();
    queueMicrotask(refreshLocale);
    return () => unsubscribe();
  }, [refreshLocale]);

  return {
    locale,
    localePreference,
    setLocale,
    setLocalePreference,
    refreshLocale,
    t,
  };
};
