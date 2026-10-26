"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { currentUser } from "./access";
import { createSeed } from "./seed";
import type { State } from "./types";

const KEY = "vrw-crm-state";

type StoreValue = {
  state: State | null;
  replace: (next: State) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as State);
      else setState(createSeed());
    } catch {
      setState(createSeed());
    }
  }, []);

  useEffect(() => {
    if (!state) return;
    sessionStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      replace: (next) => setState(next),
      reset: () => {
        const fresh = createSeed();
        sessionStorage.removeItem(KEY);
        setState(fresh);
      },
    }),
    [state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}

export function useDesk() {
  const { state, replace, reset } = useStore();
  const user = state ? currentUser(state) : null;
  return { state, replace, reset, user, ready: Boolean(state && user) };
}
