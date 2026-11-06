import type { InspectionPhoto, InspectionView } from "@/lib/rental-data";

/**
 * Line drawings of a generic car used to pin damage on when a photo isn't enough.
 * Stored as SVG strings and turned into data URIs, so they render the same in the app,
 * in exported contracts, and offline.
 */
const STROKE = "#4d5a53";
const BODY = "#f5f7f6";
const GLASS = "#dfe8e4";
const TYRE = "#3b4540";
const svg = (viewBox: string, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="${STROKE}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="0" y="0" width="100%" height="100%" fill="#ffffff" stroke="none"/>${body}</svg>`;

const side = svg("0 0 480 220", `
  <path fill="${BODY}" d="M34 162 C28 150 28 132 34 122 L46 110 C80 102 118 98 152 96 L204 58 C214 52 224 50 236 50 L322 50 C336 50 346 54 354 62 L392 94 C414 98 434 102 446 110 C454 118 456 136 452 162 L418 162 A38 38 0 0 0 342 162 L150 162 A38 38 0 0 0 74 162 Z"/>
  <path fill="${GLASS}" d="M168 96 L210 64 C216 60 222 58 230 58 L284 58 L284 96 Z"/>
  <path fill="${GLASS}" d="M296 58 L322 58 C332 58 340 62 346 68 L374 94 L296 96 Z"/>
  <path d="M162 98 L162 156 M290 96 L290 158 M392 96 L396 150"/>
  <path d="M206 118 L224 118 M330 118 L348 118"/>
  <path d="M154 96 L168 84 L176 96"/>
  <path fill="${GLASS}" d="M36 124 L60 118 L62 132 L36 136 Z"/>
  <path fill="#f3d5c6" d="M448 114 L438 114 L436 130 L452 132 Z"/>
  <path d="M40 150 L70 150 M424 150 L448 150"/>
  <circle cx="112" cy="164" r="30" fill="${TYRE}" stroke="${TYRE}"/><circle cx="112" cy="164" r="14" fill="#c9d1cd"/>
  <circle cx="380" cy="164" r="30" fill="${TYRE}" stroke="${TYRE}"/><circle cx="380" cy="164" r="14" fill="#c9d1cd"/>
  <path d="M20 196 L460 196" stroke="#d5dbd8"/>`);

const front = svg("0 0 340 240", `
  <path fill="${BODY}" d="M96 34 C100 26 108 22 118 22 L222 22 C232 22 240 26 244 34 L270 100 L300 112 C306 116 308 122 308 130 L308 186 C308 192 304 196 298 196 L42 196 C36 196 32 192 32 186 L32 130 C32 122 34 116 40 112 L70 100 Z"/>
  <path fill="${GLASS}" d="M106 36 C108 32 112 30 118 30 L222 30 C228 30 232 32 234 36 L256 96 L84 96 Z"/>
  <path d="M70 100 L270 100"/>
  <path fill="${BODY}" d="M34 98 L58 96 L60 108 L36 112 Z M306 98 L282 96 L280 108 L304 112 Z"/>
  <rect x="48" y="122" width="62" height="22" rx="8" fill="${GLASS}"/><rect x="230" y="122" width="62" height="22" rx="8" fill="${GLASS}"/>
  <rect x="124" y="124" width="92" height="30" rx="8" fill="#e8ecea"/>
  <path d="M136 134 L204 134 M136 144 L204 144"/>
  <rect x="134" y="164" width="72" height="16" rx="3" fill="#ffffff"/>
  <path d="M40 160 L300 160"/>
  <rect x="44" y="196" width="46" height="26" rx="6" fill="${TYRE}" stroke="${TYRE}"/><rect x="250" y="196" width="46" height="26" rx="6" fill="${TYRE}" stroke="${TYRE}"/>`);

const rear = svg("0 0 340 240", `
  <path fill="${BODY}" d="M96 34 C100 26 108 22 118 22 L222 22 C232 22 240 26 244 34 L266 92 L300 108 C306 112 308 118 308 126 L308 186 C308 192 304 196 298 196 L42 196 C36 196 32 192 32 186 L32 126 C32 118 34 112 40 108 L74 92 Z"/>
  <path fill="${GLASS}" d="M108 36 C110 32 114 30 120 30 L220 30 C226 30 230 32 232 36 L250 86 L90 86 Z"/>
  <path d="M74 92 L266 92 M80 104 L260 104"/>
  <path fill="#f3d5c6" d="M40 116 L96 112 L98 136 L40 140 Z M300 116 L244 112 L242 136 L300 140 Z"/>
  <rect x="128" y="120" width="84" height="20" rx="4" fill="#ffffff"/>
  <path d="M156 112 L184 112"/>
  <path d="M38 160 L302 160 M58 178 L282 178"/>
  <circle cx="86" cy="186" r="5" fill="#c9d1cd"/>
  <rect x="44" y="196" width="46" height="26" rx="6" fill="${TYRE}" stroke="${TYRE}"/><rect x="250" y="196" width="46" height="26" rx="6" fill="${TYRE}" stroke="${TYRE}"/>`);

// The right side is the left drawing mirrored, so the car faces right.
const rightSide = side.replace(`<rect x="0" y="0" width="100%" height="100%" fill="#ffffff" stroke="none"/>`, `<rect x="0" y="0" width="100%" height="100%" fill="#ffffff" stroke="none"/><g transform="translate(480 0) scale(-1 1)">`).replace("</svg>", "</g></svg>");

export const diagramViews = [
  { view: "front", label: "Front", svg: front },
  { view: "rear", label: "Rear", svg: rear },
  { view: "left", label: "Left side", svg: side },
  { view: "right", label: "Right side", svg: rightSide },
] as const satisfies readonly { view: InspectionView; label: string; svg: string }[];

export const viewLabels: Record<InspectionView, string> = { front: "Front", rear: "Rear", left: "Left side", right: "Right side", interior: "Interior", other: "Other" };

const dataUris = new Map(diagramViews.map((item) => [item.view, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`]));

/** The image source for an inspection photo or vehicle diagram. */
export function photoSrc(photo: InspectionPhoto) {
  return photo.diagram ? (dataUris.get(photo.diagram as (typeof diagramViews)[number]["view"]) ?? "") : photo.dataUrl;
}

/** A readable label: "Front diagram", "Rear photo", "Photo 3"… */
export function photoLabel(photo: InspectionPhoto, photos: InspectionPhoto[]) {
  if (photo.diagram) return `${viewLabels[photo.diagram]} diagram`;
  if (photo.view) return `${viewLabels[photo.view]} photo`;
  return `Photo ${photos.filter((item) => !item.diagram).indexOf(photo) + 1}`;
}

export function isRealPhoto(photo: InspectionPhoto) {
  return !photo.diagram;
}
