"use client";

import type { DepositDeduction } from "@/lib/deposit";
import { BrandLogo } from "@/components/brand-mark";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

export type VehicleType = "Budget" | "Premium" | "SUV";
export type Vehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  dailyRate: number;
  vehicleType: VehicleType;
  depositAmount: number;
  mileageAllowanceKmPerDay: number;
  excessMileageRatePerKm: number;
  transmission: string;
  colour?: string;
  fuelType?: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  /** Average fuel consumption in litres per 100 km. */
  fuelConsumptionLPer100Km?: number;
  status: "Available" | "Unavailable";
  imageDataUrl?: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  licence: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  idNumber?: string;
  address?: string;
  idPhotoDataUrl?: string;
  idPhotoName?: string;
  licencePhotoDataUrl?: string;
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
  depositAmount?: number;
  /** "Returned" means the deposit has been settled: refunded in full, in part, or kept. See src/lib/deposit.ts. */
  depositStatus?: "Due" | "Held" | "Returned" | "None";
  depositDeductions?: DepositDeduction[];
  depositRefundedAmount?: number;
  depositSettledAt?: string;
  mileageAllowanceKmPerDay?: number;
  excessMileageRatePerKm?: number;
  distanceKm?: number;
  includedMileageKm?: number;
  excessMileageKm?: number;
  excessMileageCharge?: number;
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

export const inspectionDamageTypes = ["Dent", "Scratch", "Crack", "Chip", "Missing part", "Other"] as const;
export type InspectionDamageType = typeof inspectionDamageTypes[number];
export type InspectionDamageMark = { id: string; x: number; y: number; type: InspectionDamageType; note?: string };
export const expenseCategories = [
  "Fuel", "Maintenance & repairs", "Tyres", "Insurance", "Licensing & registration", "Vehicle finance or lease", "Cleaning & valeting",
  "Parking & tolls", "Tracking & security", "Staff & drivers", "Rent & office", "Marketing", "Phone & internet", "Bank & payment fees", "Other",
] as const;
export type ExpenseCategory = typeof expenseCategories[number];
export const expensePaymentMethods = ["Cash", "EcoCash", "Bank transfer", "Card", "Other"] as const;
export type Expense = {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  /** The vehicle this cost belongs to; empty means general business overhead. */
  vehicleId?: string;
  payee: string;
  paymentMethod: typeof expensePaymentMethods[number];
  description: string;
  receiptDataUrl?: string;
  createdAt: string;
};

export type InspectionView = "front" | "rear" | "left" | "right" | "interior" | "other";
/** A captured photo, or (when `diagram` is set) one of the built-in vehicle line drawings with damage pins. */
export type InspectionPhoto = { id: string; name: string; dataUrl: string; marks?: InspectionDamageMark[]; view?: InspectionView; diagram?: "front" | "rear" | "left" | "right" };
export type InspectionCheckStatus = "ok" | "attention" | "na";
export type InspectionChecklist = Record<string, InspectionCheckStatus>;
export type PrebookingInspection = {
  id: string;
  customerId: string;
  vehicleId: string;
  bookingId?: string;
  stage?: "Pre-booking" | "Pickup" | "Return";
  inspectionDate: string;
  odometerKm: number;
  /** Photo of the dashboard odometer showing the recorded reading. */
  odometerPhotoDataUrl?: string;
  fuelPercent: number;
  condition: "Good" | "Fair" | "Needs attention";
  notes: string;
  checklist?: InspectionChecklist;
  /** Written details per checklist item (tyre size and brand, battery number…). */
  checklistNotes?: Record<string, string>;
  signatoryName?: string;
  signatureDataUrl?: string;
  signedAt?: string;
  /** The Classic Rides representative who carried out the inspection and signed for the company. */
  repName?: string;
  repSignatureDataUrl?: string;
  photos: InspectionPhoto[];
  createdAt: string;
};

export type CompanyProfile = { name: string; email: string; secondaryEmail?: string; phone: string; address: string; invoicePrefix: string; paymentInstructions: string; contractTerms?: string };
type StoreData = { vehicles: Vehicle[]; customers: Customer[]; bookings: Booking[]; maintenance: MaintenanceJob[]; inspections: PrebookingInspection[]; expenses: Expense[]; company: CompanyProfile };
type SaveStatus = "idle" | "saving" | "saved" | "error";
export type WorkspaceUser = { id: string; email: string; name: string; role: "super_admin" | "manager" | "sales" };
type RentalContextValue = StoreData & {
  ready: boolean;
  saveStatus: SaveStatus;
  currentUser: WorkspaceUser | null;
  retrySave: () => void;
  addVehicle: (vehicle: Omit<Vehicle, "id" | "createdAt">) => void;
  updateVehicle: (id: string, changes: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, changes: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addBooking: (booking: Omit<Booking, "id" | "reference" | "createdAt" | "status">) => Booking;
  updateBooking: (id: string, changes: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  canDelete: boolean;
  addMaintenance: (job: Omit<MaintenanceJob, "id">) => void;
  updateMaintenance: (id: string, changes: Partial<MaintenanceJob>) => void;
  addInspection: (inspection: Omit<PrebookingInspection, "id" | "createdAt">) => PrebookingInspection;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, changes: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  /** Managers and super admins can see income, expenses and profit. */
  canViewFinancials: boolean;
  updateCompany: (company: CompanyProfile) => void;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "spiritus-rental-workspace-v1";
const defaultCompany: CompanyProfile = { name: "Classic Rides", email: "sales@classicrides.online", secondaryEmail: "classicride23@gmail.com", phone: "+263 772 313 286 · +263 777 879 154", address: "", invoicePrefix: "CR", paymentInstructions: "" };
const emptyData: StoreData = { vehicles: [], customers: [], bookings: [], maintenance: [], inspections: [], expenses: [], company: defaultCompany };
function removeUkContacts(phone: string) {
  return phone.split(/[·,;|\n]+/).map((item) => item.trim()).filter((item) => item && !/^(?:\+?44|0044)(?=\s|\d|$)/.test(item)).join(" · ");
}
function normalizeData(input: Partial<StoreData>): StoreData {
  const data = { ...emptyData, ...input };
  return {
    ...data,
    company: {
      ...data.company,
      name: !data.company.name || data.company.name === "Your rental company" || data.company.name.toLowerCase().includes("spiritus") ? "Classic Rides" : data.company.name,
      email: !data.company.email || data.company.email.toLowerCase().includes("spiritus") ? "sales@classicrides.online" : data.company.email,
      phone: removeUkContacts(data.company.phone || defaultCompany.phone),
      invoicePrefix: !data.company.invoicePrefix || data.company.invoicePrefix === "INV" ? "CR" : data.company.invoicePrefix,
    },
    vehicles: data.vehicles.map((vehicle) => ({
      ...vehicle,
      vehicleType: vehicle.vehicleType ?? "Budget",
      depositAmount: Number.isFinite(vehicle.depositAmount) ? vehicle.depositAmount : 0,
      mileageAllowanceKmPerDay: Number.isFinite(vehicle.mileageAllowanceKmPerDay) ? vehicle.mileageAllowanceKmPerDay : 0,
      excessMileageRatePerKm: Number.isFinite(vehicle.excessMileageRatePerKm) ? vehicle.excessMileageRatePerKm : 0,
    })),
    inspections: data.inspections.map((inspection) => ({ ...inspection, stage: inspection.stage ?? "Pre-booking" })),
    expenses: (Array.isArray(data.expenses) ? data.expenses : []).filter((expense) => expense && Number.isFinite(expense.amount)),
  };
}
const RentalContext = createContext<RentalContextValue | null>(null);

function WorkspaceLogin({ onSuccess }: { onSuccess: (data: StoreData, user: WorkspaceUser) => void }) {
  const [email, setEmail] = useState("nick@spiritusglobal.tech");
  const [name, setName] = useState("Nick Gwanzura");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [allowedEmail, setAllowedEmail] = useState("nick@spiritusglobal.tech");
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/status", { cache: "no-store" }).then((response) => response.json()).then((result) => {
      if (!mounted) return;
      if (typeof result.email === "string") { setAllowedEmail(result.email); setEmail(result.email); }
      setSetupRequired(Boolean(result.setupRequired));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(setupRequired ? "/api/auth/bootstrap" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(setupRequired ? { email, name, password } : { email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      const workspace = await fetch("/api/workspace", { cache: "no-store" });
      const stored = await workspace.json();
      if (!workspace.ok) throw new Error(stored.error ?? "Could not load your workspace.");
      setPassword("");
      setSetupRequired(false);
      onSuccess(normalizeData(stored.data), stored.user as WorkspaceUser);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  return <main className="workspace-login"><form className="workspace-login-card" onSubmit={submit}>
    <BrandLogo size={52} className="login-brand" /><p className="eyebrow">CLASSIC RIDES</p><h1>{setupRequired ? "Set up your workspace" : "Welcome back"}<span>.</span></h1><p>{setupRequired ? "Create the first administrator account to protect your workspace." : "Sign in to your rental workspace."}</p>
    {setupRequired && <label className="form-field"><span>Full name</span><input name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>}
    <label className="form-field"><span>Work email</span><input name="email" type="email" autoComplete="username" required readOnly={setupRequired} value={setupRequired ? allowedEmail : email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label className="form-field"><span>{setupRequired ? "Create password" : "Password"}</span><div className="login-password-wrap"><input name="password" type={showPassword ? "text" : "password"} autoComplete={setupRequired ? "new-password" : "current-password"} minLength={setupRequired ? 12 : undefined} autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-visibility" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div>{setupRequired && <small>Use at least 12 characters. This password is entered by you and stored as a salted hash.</small>}</label>
    {error && <p className="login-error" role="alert">{error}</p>}<button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : setupRequired ? "Create administrator" : "Sign in"}</button>
  </form></main>;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RentalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<WorkspaceUser | null>(null);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const dataRef = useRef<StoreData>(emptyData);
  const pendingSaveRef = useRef<{ data: StoreData; version: number } | null>(null);
  const saveVersionRef = useRef(0);
  const statusVersionRef = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  // Ids deleted locally, sent with every save until the server confirms them (it merges saves by record).
  const deletedRef = useRef<Record<string, Set<string>>>({});

  function markDeleted(collection: string, ids: string[]) {
    const set = (deletedRef.current[collection] ??= new Set());
    ids.forEach((id) => set.add(id));
  }

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

    const deleted = Object.fromEntries(Object.entries(deletedRef.current).map(([name, ids]) => [name, [...ids]]));
    const operation = writeQueue.current.then(async () => {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, _deleted: deleted }),
      });
      if (!response.ok) throw new Error(`Workspace save failed (${response.status})`);
      const result = await response.json().catch(() => null) as { data?: Partial<StoreData> } | null;
      for (const [name, ids] of Object.entries(deleted)) ids.forEach((id) => deletedRef.current[name]?.delete(id));
      return result?.data;
    });
    writeQueue.current = operation.then((merged) => {
      if (pendingSaveRef.current?.version !== version) return;
      pendingSaveRef.current = null;
      // Adopt the server's merged copy (it includes records added from other devices),
      // unless something changed locally while this save was in flight.
      if (merged) {
        const adopted = normalizeData(merged);
        dataRef.current = adopted;
        setData(adopted);
      }
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
            const loaded = normalizeData(result.data);
            const storedPhone = typeof result.data?.company?.phone === "string" ? result.data.company.phone : loaded.company.phone;
            dataRef.current = loaded;
            setData(loaded); setCurrentUser(result.user as WorkspaceUser ?? null); setDatabaseConnected(true); setReady(true);
            if (storedPhone !== loaded.company.phone) {
              void fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loaded) }).then((save) => {
                if (!save.ok) console.error("Company contact cleanup could not be saved.");
              }).catch(() => console.error("Company contact cleanup could not be saved."));
            }
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
          const loaded = normalizeData(JSON.parse(stored) as Partial<StoreData>);
          dataRef.current = loaded;
          setData(loaded);
        }
      } catch { localStorage.removeItem(STORAGE_KEY); }
      setReady(true);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function replaceData(next: StoreData, user: WorkspaceUser) {
    next = normalizeData(next);
    dataRef.current = next;
    pendingSaveRef.current = null;
    saveVersionRef.current += 1;
    statusVersionRef.current += 1;
    setSaveStatus("idle");
    setData(next);
    setCurrentUser(user);
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

  // Pick up changes made on other devices when staff come back to this tab.
  useEffect(() => {
    if (!databaseConnected || authRequired) return;
    async function refresh() {
      if (document.visibilityState !== "visible" || pendingSaveRef.current) return;
      const startVersion = saveVersionRef.current;
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { data?: Partial<StoreData> };
        if (!result.data || pendingSaveRef.current || saveVersionRef.current !== startVersion) return;
        const fresh = normalizeData(result.data);
        dataRef.current = fresh;
        setData(fresh);
      } catch { /* offline: keep the local copy */ }
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [databaseConnected, authRequired]);

  // Warn before closing the tab while changes are still being saved.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingSaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = normalizeData(JSON.parse(event.newValue));
        dataRef.current = next;
        setData(next);
      } catch { /* ignore an invalid cross-tab update */ }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<RentalContextValue>(() => ({
    ...data,
    currentUser,
    ready,
    saveStatus,
    retrySave,
    addVehicle: (vehicle) => updateData((current) => ({ ...current, vehicles: [{ ...vehicle, id: makeId(), createdAt: new Date().toISOString() }, ...current.vehicles] })),
    updateVehicle: (id, changes) => updateData((current) => ({ ...current, vehicles: current.vehicles.map((vehicle) => vehicle.id === id ? { ...vehicle, ...changes } : vehicle) })),
    deleteVehicle: (id) => { markDeleted("vehicles", [id]); markDeleted("maintenance", dataRef.current.maintenance.filter((job) => job.vehicleId === id).map((job) => job.id)); updateData((current) => ({ ...current, vehicles: current.vehicles.filter((vehicle) => vehicle.id !== id), maintenance: current.maintenance.filter((job) => job.vehicleId !== id) })); },
    deleteCustomer: (id) => { markDeleted("customers", [id]); updateData((current) => ({ ...current, customers: current.customers.filter((customer) => customer.id !== id) })); },
    deleteBooking: (id) => { markDeleted("bookings", [id]); updateData((current) => ({ ...current, bookings: current.bookings.filter((booking) => booking.id !== id), inspections: current.inspections.map((inspection) => inspection.bookingId === id ? { ...inspection, bookingId: undefined } : inspection) })); },
    canDelete: !currentUser || currentUser.role !== "sales",
    updateCustomer: (id, changes) => updateData((current) => ({ ...current, customers: current.customers.map((customer) => customer.id === id ? { ...customer, ...changes } : customer) })),
    addCustomer: (customer) => {
      const created: Customer = { ...customer, id: makeId(), createdAt: new Date().toISOString() };
      updateData((current) => ({ ...current, customers: [created, ...current.customers] }));
      return created;
    },
    addBooking: (booking) => {
      const created: Booking = { ...booking, depositStatus: (booking.depositAmount ?? 0) > 0 ? "Due" : "None", id: makeId(), reference: `BK-${String(Date.now()).slice(-6)}`, status: "Confirmed", createdAt: new Date().toISOString() };
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
    addExpense: (expense) => updateData((current) => ({ ...current, expenses: [{ ...expense, id: makeId(), createdAt: new Date().toISOString() }, ...current.expenses] })),
    updateExpense: (id, changes) => updateData((current) => ({ ...current, expenses: current.expenses.map((expense) => expense.id === id ? { ...expense, ...changes } : expense) })),
    deleteExpense: (id) => { markDeleted("expenses", [id]); updateData((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== id) })); },
    canViewFinancials: !currentUser || currentUser.role !== "sales",
    updateCompany: (company) => updateData((current) => ({ ...current, company })),
    logout: async () => {
      await writeQueue.current;
      if (pendingSaveRef.current) throw new Error("Some changes haven’t been saved. Retry the save before signing out.");
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out could not be completed. Try again.");
      setAuthRequired(true); setCurrentUser(null);
    },
  }), [data, ready, databaseConnected, saveStatus, currentUser]);

  return <RentalContext.Provider value={value}>{!ready ? <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div> : authRequired ? <WorkspaceLogin onSuccess={replaceData} /> : children}</RentalContext.Provider>;
}

export function useRentalData() {
  const value = useContext(RentalContext);
  if (!value) throw new Error("useRentalData must be used inside RentalDataProvider");
  return value;
}

export function formatMoney(amount: number) {
  // Whole amounts read "$65"; amounts with cents always show both digits ("$52.50", never "$52.5").
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
}

export function nightsBetween(start: string, end: string) {
  const nights = Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000);
  return Math.max(1, nights || 1);
}

