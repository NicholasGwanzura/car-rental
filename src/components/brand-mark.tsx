import { BRAND } from "@/lib/brand";

/** The Classic Rides "CR" mark (same artwork as src/app/icon.svg). */
export function BrandLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <svg className={`brand-logo ${className}`.trim()} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="14" fill={BRAND.ink} />
    <path d="M29 21a13 13 0 1 0 0 22" fill="none" stroke={BRAND.accent} strokeWidth="7" strokeLinecap="round" />
    <path d="M38 21v22m0-22h7a7 7 0 0 1 0 14h-7m8 0 8 8" fill="none" stroke={BRAND.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
