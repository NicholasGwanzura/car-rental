# Classic Rides

Mobile-first car-rental website and operations workspace for Classic Rides.

## Run locally

1. Use Node.js 22 and PostgreSQL.
2. Copy `.env.example` to `.env`, set `DATABASE_URL`, and add a Resend key if you want to send invoices or email staff invitations.
3. Run `npm install`, then `npm run dev`.
4. Open `http://localhost:3000`. The first visit to the workspace starts administrator setup for `SUPER_ADMIN_EMAIL`; enter a unique password in the form.

The workspace creates its PostgreSQL tables when first accessed. The initial administrator is created once, and cannot be replaced through the public bootstrap flow.

## Public website and vehicle pre-booking

The home page presents Classic Rides and its services. In the Fleet workspace, copy a vehicle’s pre-booking link to share its public listing. Customers can send a request for that vehicle and dates; staff review requests in the Bookings workspace before confirming a rental.

## Rental operations

- Vehicle onboarding records Budget, Premium, or SUV type, deposit, included mileage per day, and excess mileage price per km.
- Pickup and return inspections capture a checklist, odometer, fuel, and the client’s on-screen signature. Return inspection calculates distance and excess mileage charges.
- Customer registration requires email, driver licence, next of kin details, ID number, and an ID image.
- Billing prepares printable invoices and can email them through Resend.

## Workspace roles

- **Super admin:** all workspace areas, company settings, and invitations for managers or sales staff.
- **Manager:** all operational areas and invitations for sales staff; no company settings.
- **Sales:** bookings, fleet, customers, inspections, and billing.

Invitations expire after seven days.

## Email (Resend)

The app sends three branded emails through Resend: customer invoices, team invitations, and an alert to the company inbox for every website pre-booking. All of them go through `src/lib/email.ts`, and the templates live in `src/lib/email-templates.ts`.

- `RESEND_API_KEY`: an API key with sending access.
- `RESEND_FROM_EMAIL`: the sender, for example `Classic Rides <sales@classicrides.online>`. Its domain must be verified in Resend.
- Replies go to the company email from Company settings (or the inviting staff member for invitations, and the customer for pre-booking alerts).

For classicrides.online to verify and deliver reliably, its DNS (hosted at Spaceship) needs the records Resend shows under **Domains → classicrides.online**:

| Type | Name | Value |
|------|------|-------|
| TXT | `resend._domainkey` | DKIM key from Resend (already published) |
| MX | `send` | `feedback-smtp.<region>.amazonses.com`, priority 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:sales@classicrides.online` (tighten to `quarantine` once reports look clean) |

Copy the exact MX value from the Resend dashboard, since the region varies.

## Verify the production bundle

```sh
npm run typecheck
npm run build -- --webpack
```
