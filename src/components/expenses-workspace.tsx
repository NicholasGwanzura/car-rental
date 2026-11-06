"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PageTopbar } from "@/components/app-shell";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { BookingRows, DrillLink, useDrilldown } from "@/components/drilldown";
import { compressIdentityImage } from "@/lib/identity-image";
import { receiptProblem } from "@/lib/expense-rules";
import { costEntries, inRange, incomeEntries, monthlyTrend, periodLabels, periodRange, summarize, type CostEntry, type DateRange, type MonthPoint, type PeriodKey } from "@/lib/profitability";
import { expenseCategories, expensePaymentMethods, formatMoney, useRentalData, type Expense, type ExpenseCategory, type Vehicle } from "@/lib/rental-data";

const GENERAL = "__general";

function todayValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function compactMoney(value: number) {
  if (Math.abs(value) >= 1000) return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function signedMoney(value: number) {
  return value < 0 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value);
}

function vehicleLabel(vehicle?: Vehicle) {
  return vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : "Removed vehicle";
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

/** Clean axis ticks: a 1/2/5 × 10ⁿ step, with three to five steps above zero. */
function axisTicks(value: number) {
  if (value <= 0) return [0, 25, 50, 75, 100];
  const raw = value / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((candidate) => candidate * power >= raw) ?? 10) * power;
  const count = Math.max(3, Math.ceil(value / step));
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

function TrendChart({ points, onSelect }: { points: MonthPoint[]; onSelect: (point: MonthPoint) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const ticks = axisTicks(Math.max(...points.map((point) => Math.max(point.income, point.costs)), 0));
  const max = ticks[ticks.length - 1];
  if (!points.some((point) => point.income || point.costs)) return <p className="profit-empty-note">No income or expenses in this period yet.</p>;
  return <div className="trend-chart" role="group" aria-label="Monthly rental income and expenses">
    <div className="trend-legend" aria-hidden="true"><span><i className="swatch swatch-income" />Income</span><span><i className="swatch swatch-costs" />Expenses</span></div>
    <div className="trend-body">
      <div className="trend-axis">{[...ticks].reverse().map((tick) => <span key={tick}>{compactMoney(tick)}</span>)}</div>
      <div className="trend-plot">
        {ticks.map((tick) => <span key={tick} className="trend-grid" style={{ bottom: `${(tick / max) * 100}%` }} />)}
        <div className="trend-groups">{points.map((point, index) => {
          const align = index < 2 ? "start" : index > points.length - 3 ? "end" : "center";
          return <button type="button" key={point.month} className={`trend-group${active === point.month ? " is-active" : ""}`}
            onClick={() => onSelect(point)} onMouseEnter={() => setActive(point.month)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(point.month)} onBlur={() => setActive(null)}
            aria-label={`${point.label}: income ${formatMoney(point.income)}, expenses ${formatMoney(point.costs)}, net ${signedMoney(point.net)}. Open breakdown`}>
            <span className="trend-bars">
              <span className="trend-bar trend-bar-income" style={{ height: `${(point.income / max) * 100}%` }} />
              <span className="trend-bar trend-bar-costs" style={{ height: `${(point.costs / max) * 100}%` }} />
            </span>
            {active === point.month && <span className={`trend-tooltip trend-tooltip-${align}`} role="presentation">
              <strong>{point.label}</strong>
              <span><i className="swatch swatch-income" />Income <b>{formatMoney(point.income)}</b></span>
              <span><i className="swatch swatch-costs" />Expenses <b>{formatMoney(point.costs)}</b></span>
              <span className="trend-tooltip-net">Net <b>{signedMoney(point.net)}</b></span>
              <span className="trend-tooltip-hint">Click for breakdown</span>
            </span>}
          </button>;
        })}</div>
      </div>
    </div>
    <div className="trend-labels" aria-hidden="true">{points.map((point) => <span key={point.month}>{point.label}</span>)}</div>
  </div>;
}

function CostRows({ entries }: { entries: CostEntry[] }) {
  const { expenses, vehicles } = useRentalData();
  if (!entries.length) return <p className="drill-empty">No expenses.</p>;
  return <ul className="drill-list">{[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
    const record = expenses.find((item) => item.id === entry.id);
    const vehicle = vehicles.find((item) => item.id === entry.vehicleId);
    return <li key={entry.id}><span><strong>{record?.payee || entry.description || entry.category}</strong><small>{shortDate(entry.date)} · {entry.category} · {entry.vehicleId ? <DrillLink kind="vehicle" id={vehicle?.id}>{vehicle ? `${vehicle.make} ${vehicle.model}` : "Removed vehicle"}</DrillLink> : "General business"}{entry.source === "maintenance" ? " · maintenance job" : ""}</small></span><span>{formatMoney(entry.amount)}</span></li>;
  })}</ul>;
}

function ExpenseDialog({ expense, vehicles, onClose }: { expense: Expense | null; vehicles: Vehicle[]; onClose: () => void }) {
  const { addExpense, updateExpense } = useRentalData();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const amount = Number(form.get("amount"));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount above zero.");
      const file = form.get("receipt");
      let receiptDataUrl = expense?.receiptDataUrl;
      if (file instanceof File && file.size) {
        if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) throw new Error("Choose a receipt image under 15 MB.");
        receiptDataUrl = await compressIdentityImage(file);
      }
      const missingReceipt = receiptProblem({ receiptDataUrl });
      if (missingReceipt) throw new Error(missingReceipt);
      const vehicleId = String(form.get("vehicleId"));
      const changes = {
        date: String(form.get("date")),
        amount: Math.round(amount * 100) / 100,
        category: String(form.get("category")) as ExpenseCategory,
        vehicleId: vehicleId === GENERAL ? undefined : vehicleId,
        payee: String(form.get("payee")).trim(),
        paymentMethod: String(form.get("paymentMethod")) as Expense["paymentMethod"],
        description: String(form.get("description")).trim(),
        receiptDataUrl,
      };
      if (expense) updateExpense(expense.id, changes); else addExpense(changes);
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this expense."); }
    finally { setBusy(false); }
  }
  return <WorkspaceDialog title={expense ? "Edit expense" : "Add an expense"} eyebrow="BUSINESS EXPENSE" onClose={onClose}>
    <form className="form-grid" onSubmit={save}>
      <label className="form-field"><span>Date</span><input name="date" type="date" defaultValue={expense?.date ?? todayValue()} required /></label>
      <label className="form-field"><span>Amount (USD)</span><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="e.g. 45.00" defaultValue={expense?.amount ?? ""} required /></label>
      <label className="form-field"><span>Category</span><select name="category" defaultValue={expense?.category ?? "Fuel"} required>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="form-field"><span>Vehicle</span><select name="vehicleId" defaultValue={expense?.vehicleId ?? GENERAL}><option value={GENERAL}>General business (overhead)</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select></label>
      <label className="form-field"><span>Paid to</span><input name="payee" placeholder="Supplier, garage or person" defaultValue={expense?.payee ?? ""} required /></label>
      <label className="form-field"><span>Payment method</span><select name="paymentMethod" defaultValue={expense?.paymentMethod ?? "Cash"}>{expensePaymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
      <label className="form-field form-field-wide"><span>Description <small>(optional)</small></span><textarea name="description" rows={2} placeholder="What was this for?" defaultValue={expense?.description ?? ""} /></label>
      <label className="form-field form-field-wide"><span>Receipt photo <small>(required)</small></span><input name="receipt" type="file" accept="image/*" capture="environment" required={!expense?.receiptDataUrl} /><small>{expense?.receiptDataUrl ? "A receipt is on file. Choose a new photo only to replace it." : "Photograph the receipt, invoice or till slip. An expense can’t be saved without one."}</small></label>
      {expense?.receiptDataUrl && <div className="form-field-wide fleet-image-current"><Image src={expense.receiptDataUrl} alt="Current receipt" width={90} height={120} unoptimized /><span className="table-secondary">Current receipt</span></div>}
      <p className="form-hint form-field-wide">Choose a vehicle for costs that belong to one car, so its profit is accurate. Leave it as general business for office, staff and other shared costs. Completed maintenance jobs are counted automatically.</p>
      {error && <p className="form-error form-field-wide" role="alert">{error}</p>}
      <div className="form-field-wide"><div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : expense ? "Save changes" : "Add expense"}</button></div></div>
    </form>
  </WorkspaceDialog>;
}

export function ExpensesWorkspace() {
  const { ready, bookings, expenses, maintenance, vehicles, deleteExpense, canViewFinancials } = useRentalData();
  const { open: openDrill } = useDrilldown();
  const [tab, setTab] = useState<"profit" | "expenses">("profit");
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [custom, setCustom] = useState<DateRange>(() => ({ from: todayValue().slice(0, 8) + "01", to: todayValue() }));
  const [editing, setEditing] = useState<Expense | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);

  const range = useMemo(() => periodRange(period, new Date(), custom), [period, custom]);
  const summary = useMemo(() => summarize({ bookings, expenses, maintenance, vehicles }, range), [bookings, expenses, maintenance, vehicles, range]);
  // Short periods still chart the six months up to the period end, for context.
  const trendRange = useMemo(() => {
    if (range.from.startsWith("0000") || range.to.startsWith("9999")) return range;
    const end = new Date(`${range.to}T12:00:00`);
    const sixMonthsBack = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    const floor = `${sixMonthsBack.getFullYear()}-${String(sixMonthsBack.getMonth() + 1).padStart(2, "0")}-01`;
    return { from: range.from < floor ? range.from : floor, to: range.to };
  }, [range]);
  const trend = useMemo(() => monthlyTrend({ bookings, expenses, maintenance }, trendRange), [bookings, expenses, maintenance, trendRange]);
  const ledger = useMemo(() => costEntries(expenses, maintenance).filter((entry) => inRange(entry.date, range)).filter((entry) => {
    if (categoryFilter !== "All categories" && entry.category !== categoryFilter) return false;
    if (vehicleFilter === GENERAL && entry.vehicleId) return false;
    if (vehicleFilter !== "all" && vehicleFilter !== GENERAL && entry.vehicleId !== vehicleFilter) return false;
    const record = expenses.find((item) => item.id === entry.id);
    const text = `${entry.description} ${record?.payee ?? ""} ${entry.category} ${vehicleLabel(vehicles.find((vehicle) => vehicle.id === entry.vehicleId))}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date)), [expenses, maintenance, range, categoryFilter, vehicleFilter, query, vehicles]);
  const ledgerTotal = ledger.reduce((total, entry) => total + entry.amount, 0);
  const maxCategory = Math.max(...summary.byCategory.map((row) => row.amount), 0);
  const periodName = period === "custom" ? `${shortDate(range.from)} – ${shortDate(range.to)}` : periodLabels[period];

  function openNew() { setEditing(null); setDialogOpen(true); }
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  function incomeBookings(from: DateRange) {
    const ids = new Set(incomeEntries(bookings).filter((entry) => inRange(entry.date, from)).map((entry) => entry.bookingId));
    return bookings.filter((booking) => ids.has(booking.id)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }
  function periodCosts(from: DateRange) { return costEntries(expenses, maintenance).filter((entry) => inRange(entry.date, from)); }
  function openIncome() {
    const rows = incomeBookings(range);
    openDrill({ kind: "custom", title: `Rental income · ${periodName}`, eyebrow: `${rows.length} RENTALS · ${formatMoney(summary.income)}`, content: <BookingRows bookings={rows} /> });
  }
  function openCategory(category: ExpenseCategory) {
    const rows = periodCosts(range).filter((entry) => entry.category === category);
    openDrill({ kind: "custom", title: category, eyebrow: `${periodName.toUpperCase()} · ${formatMoney(sum(rows.map((row) => row.amount)))}`, content: <CostRows entries={rows} /> });
  }
  function openOverhead() {
    const rows = periodCosts(range).filter((entry) => !entry.vehicleId);
    openDrill({ kind: "custom", title: "General business overhead", eyebrow: `${periodName.toUpperCase()} · ${formatMoney(sum(rows.map((row) => row.amount)))}`, content: <CostRows entries={rows} /> });
  }
  function openMonth(point: MonthPoint) {
    const [year, month] = point.month.split("-").map(Number);
    const monthRange = { from: `${point.month}-01`, to: `${point.month}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}` };
    const rows = incomeBookings(monthRange);
    openDrill({ kind: "custom", title: point.label, eyebrow: `NET ${signedMoney(point.net)}`, content: <>
      <div className="drill-stats"><div><span>Income</span><strong>{formatMoney(point.income)}</strong></div><div><span>Expenses</span><strong>{formatMoney(point.costs)}</strong></div><div><span>Net</span><strong>{signedMoney(point.net)}</strong></div></div>
      <section className="drill-section"><h3>Rentals<span>{rows.length}</span></h3><BookingRows bookings={rows} /></section>
      <section className="drill-section"><h3>Expenses<span>{periodCosts(monthRange).length}</span></h3><CostRows entries={periodCosts(monthRange)} /></section>
    </> });
  }
  function exportProfit() {
    downloadCsv(`classic-rides-profit-${range.from}-to-${range.to}.csv`.replace("0000-01-01", "start").replace("9999-12-31", "today"), [
      ["Classic Rides profit and loss", periodName],
      [],
      ["Rental income", summary.income.toFixed(2)],
      ["  Collected", summary.collected.toFixed(2)],
      ["  Outstanding", summary.outstanding.toFixed(2)],
      ["Deposit money kept (damage, fuel, fines…)", summary.depositKept.toFixed(2)],
      ["Expenses", summary.costs.toFixed(2)],
      ...summary.byCategory.map((row) => [`  ${row.category}`, row.amount.toFixed(2)]),
      ["Net profit", summary.net.toFixed(2)],
      ["Profit margin", percent(summary.margin)],
      [],
      ["Vehicle", "Rentals", "Rental days", "Income", "Deposit kept", "Direct costs", "Net", "Margin"],
      ...summary.byVehicle.map((row) => [vehicleLabel(row.vehicle), row.bookings, row.rentalDays, row.income.toFixed(2), row.depositKept.toFixed(2), row.costs.toFixed(2), row.net.toFixed(2), percent(row.margin)]),
      ["General business overhead", "", "", "", "", summary.overhead.toFixed(2), (-summary.overhead).toFixed(2), ""],
    ]);
  }
  function exportExpenses() {
    downloadCsv(`classic-rides-expenses-${range.from}-to-${range.to}.csv`.replace("0000-01-01", "start").replace("9999-12-31", "today"), [
      ["Date", "Category", "Vehicle", "Paid to", "Payment method", "Description", "Amount USD", "Source"],
      ...ledger.map((entry) => {
        const record = expenses.find((item) => item.id === entry.id);
        return [entry.date, entry.category, entry.vehicleId ? vehicleLabel(vehicles.find((vehicle) => vehicle.id === entry.vehicleId)) : "General business", record?.payee ?? "", record?.paymentMethod ?? "", entry.description, entry.amount.toFixed(2), entry.source === "maintenance" ? "Maintenance job" : "Expense"];
      }),
    ]);
  }

  if (!ready) return <div className="loading-state"><span className="loading-spinner" />Loading workspace…</div>;
  return <AppShell active="Expenses">
    <PageTopbar title="Expenses" />
    <main className="module-wrap expenses-wrap">
      <section className="module-page-heading"><div><p className="eyebrow">FINANCE</p><h1>Expenses & profit</h1><p className="module-summary">Record business costs and see how much the rental business, and each car, is really making.</p></div>{canViewFinancials && <button className="button button-primary page-action" type="button" onClick={openNew}><span aria-hidden="true">＋</span>Add expense</button>}</section>
      {!canViewFinancials ? <section className="data-empty"><h2>Managers only</h2><p>Ask a manager or the workspace owner for access to expenses and profit.</p></section> : <>
        <div className="finance-controls">
          <div className="finance-tabs" role="tablist" aria-label="Finance view">
            <button type="button" role="tab" aria-selected={tab === "profit"} className={tab === "profit" ? "is-active" : ""} onClick={() => setTab("profit")}>Profitability</button>
            <button type="button" role="tab" aria-selected={tab === "expenses"} className={tab === "expenses" ? "is-active" : ""} onClick={() => setTab("expenses")}>Expenses</button>
          </div>
          <div className="finance-period">
            <label><span className="sr-only">Period</span><select className="filter-select" value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)} aria-label="Period">{(Object.keys(periodLabels) as PeriodKey[]).map((key) => <option key={key} value={key}>{periodLabels[key]}</option>)}</select></label>
            {period === "custom" && <><input type="date" aria-label="From" value={custom.from} max={custom.to} onChange={(event) => setCustom((current) => ({ ...current, from: event.target.value }))} /><input type="date" aria-label="To" value={custom.to} min={custom.from} onChange={(event) => setCustom((current) => ({ ...current, to: event.target.value }))} /></>}
          </div>
        </div>

        {tab === "profit" ? <>
          <section className="profit-tiles" aria-label={`Totals for ${periodName}`}>
            <button type="button" className="profit-tile is-clickable" onClick={openIncome}><span>Rental income</span><strong>{formatMoney(summary.income)}</strong><small>{formatMoney(summary.collected)} collected · {formatMoney(summary.outstanding)} unpaid</small><em aria-hidden="true">View rentals ›</em></button>
            <button type="button" className="profit-tile is-clickable" onClick={() => setTab("expenses")}><span>Expenses</span><strong>{formatMoney(summary.costs)}</strong><small>{formatMoney(summary.directCosts)} on vehicles · {formatMoney(summary.overhead)} overhead</small><em aria-hidden="true">View expenses ›</em></button>
            <article className={`profit-tile profit-tile-net${summary.net < 0 ? " is-loss" : ""}`}><span>Net profit</span><strong>{signedMoney(summary.net)}</strong><small>{summary.net < 0 ? "Loss · " : ""}{percent(summary.margin)} margin</small></article>
            <button type="button" className="profit-tile is-clickable" onClick={openIncome}><span>Rentals</span><strong>{summary.rentals}</strong><small>{summary.rentalDays} rental days · {summary.rentalDays ? formatMoney(Math.round(summary.income / summary.rentalDays)) : "$0"} per day</small><em aria-hidden="true">View rentals ›</em></button>
          </section>
          <p className="finance-basis">Income counts active and completed rentals by pickup date. Expenses include completed maintenance jobs. Showing {periodName.toLowerCase()}.</p>

          <div className="finance-grid">
            <section className="panel finance-panel finance-panel-wide"><div className="panel-heading"><div><p className="eyebrow">TREND</p><h2>Income vs expenses by month</h2><p className="finance-panel-note">{trend.length > 1 ? `${trend[0].label} – ${trend[trend.length - 1].label}` : ""}</p></div><button className="button button-quiet" type="button" onClick={exportProfit}>↓ Export P&L CSV</button></div>
              <TrendChart points={trend} onSelect={openMonth} />
              <details className="finance-table-toggle"><summary>Show monthly table</summary>
                <div className="data-table-wrap"><table className="data-table finance-table"><thead><tr><th>MONTH</th><th>INCOME</th><th>EXPENSES</th><th>NET</th></tr></thead><tbody>{trend.map((point) => <tr key={point.month}><td data-label="Month">{point.label}</td><td data-label="Income">{formatMoney(point.income)}</td><td data-label="Expenses">{formatMoney(point.costs)}</td><td data-label="Net">{signedMoney(point.net)}</td></tr>)}</tbody></table></div>
              </details>
            </section>

            <section className="panel finance-panel"><div className="panel-heading"><div><p className="eyebrow">WHERE THE MONEY GOES</p><h2>Expenses by category</h2></div></div>
              {summary.byCategory.length === 0 ? <p className="profit-empty-note">No expenses in this period.</p> : <ul className="category-bars">{summary.byCategory.map((row) => <li key={row.category}><button type="button" className="category-row" onClick={() => openCategory(row.category)} aria-label={`${row.category}: ${formatMoney(row.amount)}. Show expenses`}>
                <span className="category-name">{row.category}</span>
                <span className="category-track"><span className="category-fill" style={{ width: `${maxCategory ? Math.max(2, (row.amount / maxCategory) * 100) : 0}%` }} /></span>
                <span className="category-value">{formatMoney(row.amount)}<small>{summary.costs ? Math.round((row.amount / summary.costs) * 100) : 0}%</small></span>
              </button></li>)}</ul>}
            </section>

            <section className="panel finance-panel"><div className="panel-heading"><div><p className="eyebrow">BOTTOM LINE</p><h2>Profit and loss</h2></div></div>
              <dl className="pnl-list">
                <div><dt><button type="button" className="drill-link" onClick={openIncome}>Rental income</button></dt><dd>{formatMoney(summary.income)}</dd></div>
                {summary.depositKept > 0 && <div><dt>Deposit money kept <small className="pnl-hint">damage, fuel, fines…</small></dt><dd>+{formatMoney(summary.depositKept)}</dd></div>}
                <div><dt>Vehicle costs</dt><dd>−{formatMoney(summary.directCosts)}</dd></div>
                <div className="pnl-subtotal"><dt>Vehicle profit</dt><dd>{signedMoney(summary.income + summary.depositKept - summary.directCosts)}</dd></div>
                <div><dt><button type="button" className="drill-link" onClick={openOverhead}>General business overhead</button></dt><dd>−{formatMoney(summary.overhead)}</dd></div>
                <div className={`pnl-total${summary.net < 0 ? " is-loss" : ""}`}><dt>Net profit</dt><dd>{signedMoney(summary.net)}</dd></div>
              </dl>
            </section>
          </div>

          <section className="panel finance-panel finance-vehicles"><div className="panel-heading"><div><p className="eyebrow">BY VEHICLE</p><h2>Profit per car</h2></div><span className="result-count">Overhead not allocated</span></div>
            {summary.byVehicle.length === 0 ? <p className="profit-empty-note">Add vehicles and bookings to see profit per car.</p> : <div className="data-table-wrap"><table className="data-table finance-table"><thead><tr><th>VEHICLE</th><th>RENTALS</th><th>RENTAL DAYS</th><th>INCOME</th><th>DEPOSIT KEPT</th><th>VEHICLE COSTS</th><th>NET</th><th>MARGIN</th><th>NET / RENTAL DAY</th></tr></thead><tbody>
              {summary.byVehicle.map((row) => <tr key={row.vehicleId}><td data-label="Vehicle"><div className="table-primary"><DrillLink kind="vehicle" id={row.vehicle?.id}>{row.vehicle ? `${row.vehicle.make} ${row.vehicle.model}` : "Removed vehicle"}</DrillLink></div><div className="table-secondary">{row.vehicle?.registration ?? ""}</div></td><td data-label="Rentals">{row.bookings}</td><td data-label="Rental days">{row.rentalDays}</td><td data-label="Income">{formatMoney(row.income)}</td><td data-label="Deposit kept">{row.depositKept > 0 ? formatMoney(row.depositKept) : "—"}</td><td data-label="Vehicle costs">{formatMoney(row.costs)}</td><td data-label="Net"><span className={row.net < 0 ? "money-loss" : "money-gain"}>{signedMoney(row.net)}</span>{row.net < 0 && <span className="loss-tag">Loss</span>}</td><td data-label="Margin">{percent(row.margin)}</td><td data-label="Net / rental day">{row.rentalDays ? signedMoney(Math.round(row.net / row.rentalDays)) : "—"}</td></tr>)}
            </tbody></table></div>}
          </section>
        </> : <>
          <div className="list-toolbar booking-toolbar">
            <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" aria-label="Search expenses" /></label>
            <select className="filter-select" aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select>
            <select className="filter-select" aria-label="Filter by vehicle" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}><option value="all">All vehicles & overhead</option><option value={GENERAL}>General business only</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registration} · {vehicle.make} {vehicle.model}</option>)}</select>
            <span className="result-count">{ledger.length} {ledger.length === 1 ? "entry" : "entries"} · {formatMoney(ledgerTotal)}</span>
            <button className="button button-quiet" type="button" onClick={exportExpenses} disabled={!ledger.length}>↓ Export CSV</button>
          </div>
          {ledger.length === 0 ? <section className="data-empty"><h2>{expenses.length ? "No expenses match" : "No expenses recorded yet"}</h2><p>{expenses.length ? `Try another period, category or vehicle. Showing ${periodName.toLowerCase()}.` : "Record fuel, insurance, repairs, staff and office costs to see your real profit."}</p><button className="button button-primary" type="button" onClick={openNew}>＋ Add an expense</button></section>
            : <div className="data-table-wrap"><table className="data-table finance-table"><thead><tr><th>DATE</th><th>EXPENSE</th><th>CATEGORY</th><th>VEHICLE</th><th>PAYMENT</th><th>AMOUNT</th><th>ACTIONS</th></tr></thead><tbody>{ledger.map((entry: CostEntry) => {
              const record = expenses.find((item) => item.id === entry.id);
              return <tr key={entry.id}>
                <td data-label="Date">{shortDate(entry.date)}</td>
                <td data-label="Expense"><div className="table-primary">{record?.payee || entry.description || entry.category}</div>{record?.description && <div className="table-secondary">{record.description}</div>}{entry.source === "maintenance" && <div className="table-secondary">From a completed maintenance job · {entry.description}</div>}</td>
                <td data-label="Category">{entry.category}</td>
                <td data-label="Vehicle">{entry.vehicleId ? <DrillLink kind="vehicle" id={vehicles.find((vehicle) => vehicle.id === entry.vehicleId)?.id}>{vehicleLabel(vehicles.find((vehicle) => vehicle.id === entry.vehicleId))}</DrillLink> : <span className="table-secondary">General business</span>}</td>
                <td data-label="Payment">{record?.paymentMethod ?? "—"}</td>
                <td data-label="Amount"><strong>{formatMoney(entry.amount)}</strong></td>
                <td data-label="Actions"><div className="row-actions">{record ? <>{record.receiptDataUrl ? <button className="text-action" type="button" onClick={() => setViewingReceipt(record)}>Receipt</button> : <button className="text-action text-action-danger" type="button" onClick={() => { setEditing(record); setDialogOpen(true); }}>Add receipt</button>}<button className="text-action" type="button" onClick={() => { setEditing(record); setDialogOpen(true); }}>Edit</button><button className="text-action text-action-danger" type="button" onClick={() => setDeleting(record)}>Delete</button></> : <Link className="text-action" href="/maintenance">View job</Link>}</div></td>
              </tr>;
            })}</tbody></table></div>}
        </>}
      </>}
    </main>
    {dialogOpen && <ExpenseDialog expense={editing} vehicles={vehicles} onClose={() => { setDialogOpen(false); setEditing(null); }} />}
    {deleting && <WorkspaceDialog title="Delete this expense?" eyebrow="PERMANENT DELETE" onClose={() => setDeleting(null)}><p className="modal-description">{formatMoney(deleting.amount)} paid to {deleting.payee || "this payee"} on {shortDate(deleting.date)} will be removed from your expenses and profit figures. This can’t be undone.</p><div className="form-actions"><button className="button button-quiet" type="button" data-dialog-initial-focus onClick={() => setDeleting(null)}>Keep it</button><button className="button button-danger" type="button" onClick={() => { deleteExpense(deleting.id); setDeleting(null); }}>Delete expense</button></div></WorkspaceDialog>}
    {viewingReceipt?.receiptDataUrl && <WorkspaceDialog title="Receipt" eyebrow={`${formatMoney(viewingReceipt.amount)} · ${viewingReceipt.payee}`} onClose={() => setViewingReceipt(null)}><Image className="receipt-image" src={viewingReceipt.receiptDataUrl} alt={`Receipt from ${viewingReceipt.payee}`} width={800} height={1100} unoptimized /><div className="form-actions"><a className="button button-primary" href={viewingReceipt.receiptDataUrl} download={`receipt-${viewingReceipt.date}-${viewingReceipt.payee.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "expense"}.jpg`}>Download receipt</a></div></WorkspaceDialog>}
  </AppShell>;
}
