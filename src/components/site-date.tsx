"use client";

import { createContext, useContext, type ReactNode } from "react";

const SiteDateContext = createContext<string | null>(null);

export function SiteDateProvider({
  today,
  children,
}: {
  today: string;
  children: ReactNode;
}) {
  return (
    <SiteDateContext.Provider value={today}>
      {children}
    </SiteDateContext.Provider>
  );
}

// Reuse the server's Casablanca date during hydration instead of reading a second clock.
export function useSiteDate() {
  const today = useContext(SiteDateContext);
  if (!today) throw new Error("SiteDateProvider is required.");
  return today;
}
