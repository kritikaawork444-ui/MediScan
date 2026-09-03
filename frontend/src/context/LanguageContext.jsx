import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getLanguage, setLanguage as setLangUtil, t as tRaw, LANGUAGES } from "../utils/i18n.js";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  languages: LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getLanguage());

  useEffect(() => {
    const onLang = (e) => {
      const code = e?.detail?.code || getLanguage();
      setLanguageState(code);
    };
    window.addEventListener("mediscan:language", onLang);
    return () => window.removeEventListener("mediscan:language", onLang);
  }, []);

  const setLanguage = useCallback((code) => {
    setLangUtil(code);
    setLanguageState(code);
  }, []);

  const t = useCallback((key) => tRaw(key, language), [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
