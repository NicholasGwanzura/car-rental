import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://classicrides.online"),
  title: { default: "Classic Rides | Car Rental", template: "%s | Classic Rides" },
  description: "Flexible budget, premium, and SUV car rentals. Contact Classic Rides for self-drive hire, chauffeur service, airport transfers, and more.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Classic Rides" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}<PwaRegister /></body></html>;
}
