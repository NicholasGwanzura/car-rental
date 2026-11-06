"use client";

import { useId, useState, type FormEvent } from "react";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { deductionReasons, resolveDeductions, settlementChanges, type DeductionDraft } from "@/lib/deposit";
import { formatMoney, type Booking } from "@/lib/rental-data";

/**
 * Settling a refundable deposit: refund it in full, or refund it after itemised deductions.
 * `DepositSettlementFields` is the form section; `DepositSettlementDialog` wraps it for use after the return.
 */

export type SettlementMode = "later" | "full" | "partial";
export type SettlementDraft = { mode: SettlementMode; rows: DeductionDraft[] };
export type SettlementChanges = ReturnType<typeof settlementChanges>;
export type SettlementResult = { ok: true; changes: SettlementChanges | null } | { ok: false; error: string };

const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const blankRow = (): DeductionDraft => ({ id: makeId(), reason: "Damage", note: "", amount: "" });

export const emptySettlement = (mode: SettlementMode = "later"): SettlementDraft => ({ mode, rows: [] });

/** Turns what was chosen into the booking changes to store (null means "decide later"). */
export function resolveSettlement(amount: number, draft: SettlementDraft): SettlementResult {
  if (draft.mode === "later") return { ok: true, changes: null };
  if (draft.mode === "full") return { ok: true, changes: settlementChanges(amount, []) };
  const result = resolveDeductions(amount, draft.rows);
  if (!result.ok) return result;
  if (!result.deductions.length) return { ok: false, error: "Add at least one deduction, or choose “Refund in full”." };
  return { ok: true, changes: settlementChanges(amount, result.deductions) };
}

/** Lenient total for the live preview while someone is still typing. */
function previewDeducted(rows: DeductionDraft[]) {
  return Math.round(rows.reduce((total, row) => { const value = Number(row.amount.replace(/[$,\s]/g, "")); return total + (Number.isFinite(value) && value > 0 ? value : 0); }, 0) * 100) / 100;
}

export function DepositSettlementFields({ amount, value, onChange, allowLater = true }: {
  amount: number;
  value: SettlementDraft;
  onChange: (next: SettlementDraft) => void;
  /** Offer "Decide later" (used on the return form; the standalone dialog always settles). */
  allowLater?: boolean;
}) {
  const group = useId();
  const deducted = value.mode === "partial" ? previewDeducted(value.rows) : 0;
  const refund = Math.round((amount - deducted) * 100) / 100;
  const over = refund < 0;
  const choose = (mode: SettlementMode) => onChange({ mode, rows: mode === "partial" && value.rows.length === 0 ? [blankRow()] : value.rows });
  const update = (id: string, changes: Partial<DeductionDraft>) => onChange({ ...value, rows: value.rows.map((row) => row.id === id ? { ...row, ...changes } : row) });
  const options: { mode: SettlementMode; title: string; detail: string }[] = [
    ...(allowLater ? [{ mode: "later" as const, title: "Decide later", detail: `Keep holding the ${formatMoney(amount)} for now.` }] : []),
    { mode: "full", title: "Refund in full", detail: `Return the whole ${formatMoney(amount)} to the customer.` },
    { mode: "partial", title: "Refund after deductions", detail: "Keep part of it for damage, missing items, fuel, fines or cleaning." },
  ];

  return <fieldset className="deposit-fields">
    <legend>Refundable deposit · {formatMoney(amount)}</legend>
    <div className="deposit-options" role="radiogroup" aria-label="What happens to the deposit">
      {options.map((option) => <label key={option.mode} className={`deposit-option${value.mode === option.mode ? " is-selected" : ""}`}>
        <input type="radio" name={group} checked={value.mode === option.mode} onChange={() => choose(option.mode)} />
        <span><strong>{option.title}</strong><small>{option.detail}</small></span>
      </label>)}
    </div>
    {value.mode === "partial" && <div className="deposit-deductions">
      {value.rows.map((row, index) => <div className="deposit-deduction" key={row.id}>
        <select aria-label={`Deduction ${index + 1} reason`} value={row.reason} onChange={(event) => update(row.id, { reason: event.target.value })}>{deductionReasons.map((reason) => <option key={reason}>{reason}</option>)}</select>
        <input aria-label={`Deduction ${index + 1} details`} placeholder="What for? e.g. rear bumper" value={row.note} onChange={(event) => update(row.id, { note: event.target.value })} />
        <span className="deposit-amount"><i aria-hidden="true">$</i><input aria-label={`Deduction ${index + 1} amount`} inputMode="decimal" placeholder="0.00" value={row.amount} onChange={(event) => update(row.id, { amount: event.target.value })} /></span>
        <button type="button" className="deposit-remove" aria-label={`Remove deduction ${index + 1}`} onClick={() => onChange({ ...value, rows: value.rows.filter((item) => item.id !== row.id) })}>×</button>
      </div>)}
      <button type="button" className="text-action text-action-primary deposit-add" onClick={() => onChange({ ...value, rows: [...value.rows, blankRow()] })}>＋ Add deduction</button>
      <dl className={`deposit-totals${over ? " is-over" : ""}`} aria-live="polite">
        <div><dt>Deposit held</dt><dd>{formatMoney(amount)}</dd></div>
        <div><dt>Deductions</dt><dd>−{formatMoney(deducted)}</dd></div>
        <div className="deposit-refund"><dt>Refund to customer</dt><dd>{over ? "—" : formatMoney(refund)}</dd></div>
      </dl>
      {over && <p className="form-error" role="alert">The deductions are more than the deposit.</p>}
    </div>}
  </fieldset>;
}

export function DepositSettlementDialog({ booking, deposit, onSave, onClose }: { booking: Booking; deposit: number; onSave: (changes: SettlementChanges) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SettlementDraft>(emptySettlement("full"));
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = resolveSettlement(deposit, draft);
    if (!result.ok) { setError(result.error); return; }
    if (result.changes) onSave(result.changes);
    onClose();
  }
  return <WorkspaceDialog title="Settle the deposit" eyebrow={booking.reference} onClose={onClose}>
    <p className="modal-description">Record what happens to the refundable deposit now the vehicle is back. This is saved on the booking, shown on the customer’s receipt and counted in your accounts.</p>
    <form className="form-grid" onSubmit={submit}>
      <div className="form-field-wide"><DepositSettlementFields amount={deposit} value={draft} onChange={(next) => { setError(""); setDraft(next); }} allowLater={false} /></div>
      {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
      <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Record settlement</button></div></div>
    </form>
  </WorkspaceDialog>;
}
