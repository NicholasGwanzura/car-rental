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
export type PaymentStatus = "Paid" | "Unpaid";
export type Booking = {
  id: string;
  reference: string;
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  total: number;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  note: string;
  checkoutOdometer?: number;
  checkoutFuel?: number;
  checkoutNote?: string;
  returnOdometer?: number;
  returnFuel?: number;
  returnNote?: string;
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

export type InspectionPhoto = { id: string; name: string; dataUrl: string };
export type PrebookingInspection = {
  id: string;
  customerId: string;
  vehicleId: string;
  bookingId?: string;
  inspectionDate: string;
  odometerKm: number;
  fuelPercent: number;
  condition: "Good" | "Fair" | "Needs attention";
  notes: string;
  photos: InspectionPhoto[];
  createdAt: string;
};

export type CompanyProfile = { name: string; email: string; phone: string; address: string; invoicePrefix: string; paymentInstructions: string };
type StoreData = { vehicles: Vehicle[]; customers: Customer[]; bookings: Booking[]; maintenance: MaintenanceJob[]; inspections: PrebookingInspection[]; company: CompanyProfile };
type SaveStatus = "idle" | "saving" | "saved" | "error";
type RentalContextValue = StoreData & {
  ready: boolean;
  saveStatus: SaveStatus;
  retrySave: () => void;
  addVehicle: (vehicle: Omit<Vehicle, "id" | "createdAt">) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => void;
  addBooking: (booking: Omit<Booking, "id" | "reference" | "createdAt" | "status">) => Booking;
  updateBooking: (id: string, changes: Partial<Booking>) => void;
  addMaintenance: (job: Omit<MaintenanceJob, "id">) => void;
  updateMaintenance: (id: string, changes: Partial<MaintenanceJob>) => void;
  addInspection: (inspection: Omit<PrebookingInspection, "id" | "createdAt">) => PrebookingInspection;
  updateCompany: (company: CompanyProfile) => void;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "spiritus-rental-workspace-v1";
const defaultCompany: CompanyProfile = { name: "Your rental company", email: "", phone: "", address: "", invoicePrefix: "INV", paymentInstructions: "" };
const emptyData: StoreData = { vehicles: [], customers: [], bookings: [], maintenance: [], inspections: [], company: defaultCompany };
const RentalContext = createContext<RentalContextValue | null>(null);

function WorkspaceLogin({ onSuccess }: { onSuccess: (data: StoreData) => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setPassword("");
      onSuccess({ ...emptyData, ...stored.data });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  return <main className="workspace-login"><form className="workspace-login-card" onSubmit={submit}>
    <div className="brand-mark login-brand">S</div><p className="eyebrow">SPIRITUS RENTAL</p><h1>Welcome back<span>.</span></h1><p>Sign in to your rental workspace.</p>
    <label className="form-field"><span>Workspace password</span><div className="login-password-wrap"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-visibility" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label>
    {error && <p className="login-error" role="alert">{error}</p>}<button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
  </form></main>;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RentalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [ready, setReady] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const dataRef = useRef<StoreData>(emptyData);
  const pendingSaveRef = useRef<{ data: StoreData; version: number } | null>(null);
  const saveVersionRef = useRef(0);
  const statusVersionRef = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  function showSaveStatus(status: SaveStatus) {
    const version = ++statusVersionRef.current;
    setSaveStatus(status);
    if (status === "saved") {
      window.setTimeout(() => {
        if (statusVersionRef.current === version) setSaveStatus("idle");
      }, 2400);
    }
  }

  function persistData(next: StoreData) {
    const version = ++saveVersionRef.current;
    pendingSaveRef.current = { data: next, version };
    showSaveStatus("saving");

    if (!databaseConnected) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        pendingSaveRef.current = null;
        showSaveStatus("saved");
      } catch (error) {
        console.error("Workspace browser storage failed", error);
        showSaveStatus("error");
      }
      return;
    }

    const operation = writeQueue.current.then(async () => {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error(`Workspace save failed (${response.status})`);
    });
    writeQueue.current = operation.then(() => {
      if (pendingSaveRef.current?.version !== version) return;
      pendingSaveRef.current = null;
      showSaveStatus("saved");
    }, (error: unknown) => {
      console.error("Workspace data could not be saved", error);
      if (pendingSaveRef.current?.version === version) showSaveStatus("error");
    });
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (mounted) {
            const loaded = { ...emptyData, ...result.data };
            dataRef.current = loaded;
            setData(loaded); setDatabaseConnected(true); setReady(true);
          }
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
        if (stored) {
          const loaded = { ...emptyData, ...(JSON.parse(stored) as Partial<StoreData>) };
          dataRef.current = loaded;
          setData(loaded);
        }
      } catch { localStorage.removeItem(STORAGE_KEY); }
      setReady(true);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function replaceData(next: StoreData) {
    dataRef.current = next;
    pendingSaveRef.current = null;
    saveVersionRef.current += 1;
    statusVersionRef.current += 1;
    setSaveStatus("idle");
    setData(next);
    setAuthRequired(false);
    setDatabaseConnected(true);
    setReady(true);
  }

  function updateData(updater: (current: StoreData) => StoreData) {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    persistData(next);
  }

  function retrySave() {
    const pending = pendingSaveRef.current;
    if (pending) persistData(pending.data);
  }

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = { ...emptyData, ...JSON.parse(event.newValue) };
        dataRef.current = next;
        setData(next);
      } catch { /* ignore an invalid cross-tab update */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<RentalContextValue>(() => ({
    ...data,
    ready,
    saveStatus,
    retrySave,
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
    addInspection: (inspection) => {
      const created: PrebookingInspection = { ...inspection, id: makeId(), createdAt: new Date().toISOString() };
      updateData((current) => ({ ...current, inspections: [created, ...current.inspections] }));
      return created;
    },
    updateCompany: (company) => updateData((current) => ({ ...current, company })),
    logout: async () => {
      await writeQueue.current;
      if (pendingSaveRef.current) throw new Error("Some changes haven’t been saved. Retry the save before signing out.");
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out could not be completed. Try again.");
      setAuthRequired(true);
    },
  }), [data, ready, databaseConnected, saveStatus]);

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

