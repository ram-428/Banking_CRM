"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { currentUser } from "./access";
import { createSeed } from "./seed";
import type { State } from "./types";

const EARLY_LENDING_CODES = ["DOC-TL", "DOC-MOA", "DOC-EID", "DOC-PP", "DOC-BS", "DOC-AFS", "DOC-EL", "DOC-RS", "DOC-CP", "DOC-LAF"];

function withLendingSample(state: State, seed: State): State {
  const seededService = seed.services.find((item) => item.id === "svc-lending");
  const services = state.services.map((item) =>
    item.id === "svc-lending" && seededService && item.documentCodes.length === EARLY_LENDING_CODES.length && EARLY_LENDING_CODES.every((code) => item.documentCodes.includes(code))
      ? { ...item, documentCodes: seededService.documentCodes }
      : item,
  );
  const lendingService = services.find((item) => item.id === "svc-lending");
  if (!lendingService || state.serviceRequests.some((item) => item.id === "req-lending")) return { ...state, services };
  const seededRequest = seed.serviceRequests.find((item) => item.id === "req-lending");
  const seededInstance = seed.serviceInstances.find((item) => item.id === "si-lending");
  const seededInvite = seed.invitations.find((item) => item.id === "inv-lending");
  if (!seededRequest || !seededInstance || !seededInvite) return { ...state, services };
  const n = (state.counters?.request ?? 0) + 1;
  const number = `REQ-${String(n).padStart(4, "0")}`;
  return {
    ...state,
    services,
    serviceRequests: [{ ...seededRequest, number }, ...state.serviceRequests],
    serviceInstances: [seededInstance, ...state.serviceInstances],
    invitations: state.invitations.some((item) => item.id === seededInvite.id)
      ? state.invitations
      : [{ ...seededInvite, message: `Upload the documents for ${number}.` }, ...state.invitations],
    counters: { ...state.counters, request: n },
  };
}

function withOneServicePerRequest(state: State): State {
  let next = state;
  let n = state.counters?.request ?? 0;
  for (const request of state.serviceRequests) {
    const instances = next.serviceInstances.filter((item) => item.requestId === request.id);
    for (const instance of instances.slice(1)) {
      n += 1;
      const id = `req-${n}`;
      const number = `REQ-${String(n).padStart(4, "0")}`;
      next = {
        ...next,
        serviceRequests: [{ ...request, id, number, previousRequestId: undefined }, ...next.serviceRequests],
        serviceInstances: next.serviceInstances.map((item) => (item.id === instance.id ? { ...item, requestId: id } : item)),
        serviceActivities: next.serviceActivities.map((item) => (item.instanceId === instance.id ? { ...item, requestId: id } : item)),
        invitations: [
          ...next.invitations,
          ...next.invitations
            .filter((item) => item.requestId === request.id)
            .map((item) => ({ ...item, id: `${item.id}-${id}`, requestId: id, message: `Upload the documents for ${number}.` })),
        ],
      };
    }
  }
  return n === (state.counters?.request ?? 0) ? state : { ...next, counters: { ...next.counters, request: n } };
}

function withServiceModel(state: State): State {
  const seed = createSeed();
  return withOneServicePerRequest(withLendingSample(withServiceModelBase(state, seed), seed));
}

function withServiceModelBase(state: State, seed: State): State {
  return {
    ...state,
    customers: state.customers.map((customer) => {
      const seeded = seed.customers.find((item) => item.id === customer.id);
      return {
        ...customer,
        turnovers: customer.turnovers ?? seeded?.turnovers ?? [],
        averageBalances: customer.averageBalances ?? seeded?.averageBalances ?? [],
      };
    }),
    services: state.services
      ? [...state.services, ...seed.services.filter((item) => !state.services.some((existing) => existing.id === item.id || existing.name.trim().toLowerCase() === item.name.toLowerCase()))]
      : seed.services,
    serviceRequests: state.serviceRequests ?? seed.serviceRequests,
    serviceInstances: state.serviceInstances ?? seed.serviceInstances,
    serviceActivities: state.serviceActivities ?? seed.serviceActivities,
    loanDeliveries: state.loanDeliveries ?? seed.loanDeliveries,
    extractions: state.extractions ?? seed.extractions,
    counters: {
      ...seed.counters,
      ...state.counters,
      request: state.counters?.request ?? seed.counters.request,
      serviceInstance: state.counters?.serviceInstance ?? seed.counters.serviceInstance,
    },
  };
}

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
      if (raw) setState(withServiceModel(JSON.parse(raw) as State));
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
