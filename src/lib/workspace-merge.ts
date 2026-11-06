/**
 * Server-side merge for workspace saves.
 *
 * The browser sends its whole workspace on every save. Replacing the stored copy with it
 * would let a stale tab or a second device silently wipe records it hasn't seen yet (for
 * example a customer just added on a phone). Instead each collection is merged by record id:
 * - records the client sends are kept as sent (the client's edit wins),
 * - records only the server has are kept, unless the client explicitly deleted them.
 */

export const COLLECTIONS = ["vehicles", "customers", "bookings", "maintenance", "inspections", "expenses"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];
export type DeletedIds = Partial<Record<CollectionName, string[]>>;
type Doc = Record<string, unknown>;

function recordId(record: unknown) {
  return record && typeof record === "object" && typeof (record as { id?: unknown }).id === "string" ? (record as { id: string }).id : null;
}

/** Reads the `_deleted` list a client sends with a save, keeping only well-formed ids. */
export function parseDeleted(value: unknown): DeletedIds {
  if (!value || typeof value !== "object") return {};
  const result: DeletedIds = {};
  for (const name of COLLECTIONS) {
    const ids = (value as Record<string, unknown>)[name];
    if (Array.isArray(ids)) result[name] = ids.filter((id): id is string => typeof id === "string").slice(0, 500);
  }
  return result;
}

export function hasDeletions(deleted: DeletedIds, names: readonly CollectionName[]) {
  return names.some((name) => (deleted[name]?.length ?? 0) > 0);
}

export function mergeWorkspace(current: Doc, incoming: Doc, deleted: DeletedIds): Doc {
  const next: Doc = { ...current, ...incoming };
  for (const name of COLLECTIONS) {
    const sent = Array.isArray(incoming[name]) ? incoming[name] as unknown[] : undefined;
    const stored = Array.isArray(current[name]) ? current[name] as unknown[] : [];
    if (!sent) { next[name] = stored; continue; }
    const sentIds = new Set(sent.map(recordId).filter(Boolean));
    const removed = new Set(deleted[name] ?? []);
    // Records added elsewhere that this client hasn't loaded yet stay, at the top like new records.
    const serverOnly = stored.filter((record) => {
      const id = recordId(record);
      return id !== null && !sentIds.has(id) && !removed.has(id);
    });
    next[name] = [...serverOnly, ...sent.filter((record) => !removed.has(recordId(record) ?? ""))];
  }
  delete next._deleted;
  return next;
}
