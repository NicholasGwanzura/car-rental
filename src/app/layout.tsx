import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RentalDataProvider } from "@/lib/rental-data";
import "./globals.css";

export const metadata: Metadata = { title: "Spiritus Car Rental", description: "Car rental operations" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><RentalDataProvider>{children}</RentalDataProvider></body></html>;
}
