"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

export type Vehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  dailyRate: number;
  transmission: string;
  status: "Available" | "Unavailable";
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  licence: string;
  createdAt: string;
};

export type BookingStatus = "Confirmed" | "Active" | "Completed" | "Cancelled";
export type Booking = {
  id: string;
  reference: string;
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  total: number;
  status: BookingStatus;
  note: string;
  checkoutOdometer?: number;
  checkoutFuel?: number;
  returnOdometer?: number;
  returnFuel?: number;
  createdAt: string;
};

export type MaintenanceJob = {
  id: string;
  vehicleId: string;
  title: string;
  dueDate: string;
  cost: number;
  status: "Scheduled" | "In progress" | "Completed";
  note: string;
};

type StoreData = { vehicles: Vehicle[]; customers: Customer[]; bookings: Booking[]; maintenance: MaintenanceJob[] };
type RentalContextValue = StoreData & {
  ready: boolean;
  addVehicle: (vehicle: Omit<Vehicle, "id" | "createdAt">) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => void;
  addBooking: (booking: Omit<Booking, "id" | "reference" | "createdAt" | "status">) => Booking;
  updateBooking: (id: string, changes: Partial<Booking>) => void;
  addMaintenance: (job: Omit<MaintenanceJob, "id">) => void;
  updateMaintenance: (id: string, changes: Partial<MaintenanceJob>) => void;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "spiritus-rental-workspace-v1";
const emptyData: StoreData = { vehicles: [], customers: [], bookings: [], maintenance: [] };
const RentalContext = createContext<RentalContextValue | null>(null);

function WorkspaceLogin({ onSuccess }: { onSuccess: (data: StoreData) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      const workspace = await fetch("/api/workspace", { cache: "no-store" });
      const stored = await workspace.json();
      if (!workspace.ok) throw new Error(stored.error ?? "Could not load your workspace.");
      onSuccess({ ...emptyData, ...stored.data });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  return <main className="workspace-login"><form className="workspace-login-card" onSubmit={submit}><div className="brand-mark login-brand">S</div><p className="eyebrow">SPIRITUS RENTAL</p><h1>Welcome back<span>.</span></h1><p>Sign in to your rental workspace.</p><label className="form-field"><span>Workspace password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form></main>;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RentalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [ready, setReady] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (mounted) { setData({ ...emptyData, ...result.data }); setDatabaseConnected(true); setReady(true); }
          return;
        }
        if (response.status === 401) {
          if (mounted) { setAuthRequired(true); setDatabaseConnected(true); setReady(true); }
          return;
        }
      } catch { /* Local preview remains usable when its API has no database. */ }
      if (!mounted) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setData({ ...emptyData, ...(JSON.parse(stored) as Partial<StoreData>) });
      } catch { localStorage.removeItem(STORAGE_KEY); }
      setReady(true);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function replaceData(next: StoreData) {
    setData(next);
    setAuthRequired(false);
    setDatabaseConnected(true);
    setReady(true);
  }

  function updateData(updater: (current: StoreData) => StoreData) {
    setData((current) => {
      const next = updater(current);
      if (databaseConnected) {
        writeQueue.current = writeQueue.current.then(async () => {
          const response = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
          if (!response.ok) throw new Error("Workspace save failed");
        }).catch((error) => console.error("Workspace data could not be saved", error));
      } else {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (error) { console.error("Workspace browser storage failed", error); }
      }
      return next;
    });
  }

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try { setData({ ...emptyData, ...JSON.parse(event.newValue) }); } catch { /* ignore an invalid cross-tab update */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<RentalContextValue>(() => ({
    ...data,
    ready,
    addVehicle: (vehicle) => updateData((current) => ({ ...current, vehicles: [{ ...vehicle, id: makeId(), createdAt: new Date().toISOString() }, ...current.vehicles] })),
    addCustomer: (customer) => updateData((current) => ({ ...current, customers: [{ ...customer, id: makeId(), createdAt: new Date().toISOString() }, ...current.customers] })),
    addBooking: (booking) => {
      const created: Booking = { ...booking, id: makeId(), reference: `BK-${String(Date.now()).slice(-6)}`, status: "Confirmed", createdAt: new Date().toISOString() };
      updateData((current) => ({ ...current, bookings: [created, ...current.bookings] }));
      return created;
    },
    updateBooking: (id, changes) => updateData((current) => ({ ...current, bookings: current.bookings.map((booking) => booking.id === id ? { ...booking, ...changes } : booking) })),
    addMaintenance: (job) => updateData((current) => ({ ...current, maintenance: [{ ...job, id: makeId() }, ...current.maintenance] })),
    updateMaintenance: (id, changes) => updateData((current) => ({ ...current, maintenance: current.maintenance.map((job) => job.id === id ? { ...job, ...changes } : job) })),
    logout: async () => { await fetch("/api/auth/logout", { method: "POST" }); setAuthRequired(true); },
  }), [data, ready, databaseConnected]);

  return <RentalContext.Provider value={value}>{!ready ? <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div> : authRequired ? <WorkspaceLogin onSuccess={replaceData} /> : children}</RentalContext.Provider>;
}

export function useRentalData() {
  const value = useContext(RentalContext);
  if (!value) throw new Error("useRentalData must be used inside RentalDataProvider");
  return value;
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function nightsBetween(start: string, end: string) {
  const nights = Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000);
  return Math.max(1, nights || 1);
}

