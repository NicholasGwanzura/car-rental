import { describe, expect, it } from "vitest";
import { hasDeletions, mergeWorkspace, parseDeleted } from "./workspace-merge";

const empty = { vehicles: [], customers: [], bookings: [], maintenance: [], inspections: [], expenses: [] };

describe("mergeWorkspace", () => {
  it("keeps a customer added on another device when a stale tab saves", () => {
    const server = { ...empty, customers: [{ id: "new", name: "Added on phone" }, { id: "c1", name: "Tendai" }] };
    const staleTab = { ...empty, customers: [{ id: "c1", name: "Tendai Moyo" }], bookings: [{ id: "b1" }] };
    const merged = mergeWorkspace(server, staleTab, {});
    expect(merged.customers).toEqual([{ id: "new", name: "Added on phone" }, { id: "c1", name: "Tendai Moyo" }]);
    expect(merged.bookings).toEqual([{ id: "b1" }]);
  });

  it("removes only what the client explicitly deleted", () => {
    const server = { ...empty, vehicles: [{ id: "v1" }, { id: "v2" }], maintenance: [{ id: "m1", vehicleId: "v2" }] };
    const client = { ...empty, vehicles: [{ id: "v1" }] };
    const merged = mergeWorkspace(server, client, { vehicles: ["v2"], maintenance: ["m1"] });
    expect(merged.vehicles).toEqual([{ id: "v1" }]);
    expect(merged.maintenance).toEqual([]);
  });

  it("keeps stored collections the client didn't send and drops the _deleted field", () => {
    const merged = mergeWorkspace({ ...empty, expenses: [{ id: "e1" }] }, { vehicles: [], customers: [], bookings: [], maintenance: [], _deleted: {} }, {});
    expect(merged.expenses).toEqual([{ id: "e1" }]);
    expect(merged).not.toHaveProperty("_deleted");
  });

  it("parses deletions defensively", () => {
    const deleted = parseDeleted({ customers: ["c1", 5, null], bogus: ["x"] });
    expect(deleted).toEqual({ customers: ["c1"] });
    expect(hasDeletions(deleted, ["customers"])).toBe(true);
    expect(hasDeletions(parseDeleted(null), ["customers"])).toBe(false);
  });
});
