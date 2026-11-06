import type { CompanyProfile } from "@/lib/rental-data";

/** Classic Rides brand used on every printed / PDF document. */
export const BRAND = {
  ink: "#000000",
  accent: "#f36b21",
  muted: "#666666",
  soft: "#f7f8f5",
  website: "classicrides.online",
} as const;

/** Company details used whenever a field in Company settings is left empty. */
export const DEFAULT_COMPANY_DETAILS = {
  name: "Classic Rides",
  email: "sales@classicrides.online",
  phone: "+263 772 313 286 · +263 777 879 154",
  address: "Harare, Zimbabwe",
} as const;

/** The "CR" mark from src/app/icon.svg, inlined so it renders inside standalone documents. */
export const BRAND_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="44" height="44" aria-hidden="true"><rect width="64" height="64" rx="14" fill="${BRAND.ink}"/><path d="M29 21a13 13 0 1 0 0 22" fill="none" stroke="${BRAND.accent}" stroke-width="7" stroke-linecap="round"/><path d="M38 21v22m0-22h7a7 7 0 0 1 0 14h-7m8 0 8 8" fill="none" stroke="${BRAND.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export type BrandedCompany = { name: string; email: string; phone: string; address: string; website: string };

export function brandedCompany(company: Partial<CompanyProfile> | undefined): BrandedCompany {
  return {
    name: company?.name?.trim() || DEFAULT_COMPANY_DETAILS.name,
    email: company?.email?.trim() || DEFAULT_COMPANY_DETAILS.email,
    phone: company?.phone?.trim() || DEFAULT_COMPANY_DETAILS.phone,
    address: company?.address?.trim() || DEFAULT_COMPANY_DETAILS.address,
    website: BRAND.website,
  };
}

/** WhatsApp number for enquiries and pre-booking requests (international format, digits only). */
export const WHATSAPP_NUMBER = "263772313286";
export const WHATSAPP_DISPLAY = "+263 772 313 286";

export function whatsappLink(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
