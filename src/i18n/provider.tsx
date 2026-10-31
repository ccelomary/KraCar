"use client";
import { createContext, useContext, useMemo } from "react";
import { createTranslator, type Locale, type Messages } from "./core";
const LocaleContext = createContext(createTranslator("en", {}));
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const translate = useMemo(
    () => createTranslator(locale, messages),
    [locale, messages],
  );
  return (
    <LocaleContext.Provider value={translate}>
      {children}
    </LocaleContext.Provider>
  );
}
export function useTranslations() {
  return useContext(LocaleContext);
}
