"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
};

const STORAGE_KEY = "spiritus-rental-workspace-v1";
const emptyData: StoreData = { vehicles: [], customers: [], bookings: [], maintenance: [] };
const RentalContext = createContext<RentalContextValue | null>(null);

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RentalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoreData>;
        setData({ ...emptyData, ...parsed });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

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
    addVehicle: (vehicle) => setData((current) => ({ ...current, vehicles: [{ ...vehicle, id: makeId(), createdAt: new Date().toISOString() }, ...current.vehicles] })),
    addCustomer: (customer) => setData((current) => ({ ...current, customers: [{ ...customer, id: makeId(), createdAt: new Date().toISOString() }, ...current.customers] })),
    addBooking: (booking) => {
      const created: Booking = { ...booking, id: makeId(), reference: `BK-${String(Date.now()).slice(-6)}`, status: "Confirmed", createdAt: new Date().toISOString() };
      setData((current) => ({ ...current, bookings: [created, ...current.bookings] }));
      return created;
    },
    updateBooking: (id, changes) => setData((current) => ({ ...current, bookings: current.bookings.map((booking) => booking.id === id ? { ...booking, ...changes } : booking) })),
    addMaintenance: (job) => setData((current) => ({ ...current, maintenance: [{ ...job, id: makeId() }, ...current.maintenance] })),
    updateMaintenance: (id, changes) => setData((current) => ({ ...current, maintenance: current.maintenance.map((job) => job.id === id ? { ...job, ...changes } : job) })),
  }), [data, ready]);

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
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

