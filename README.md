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

Invitations expire after seven days. Email delivery uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Verify the sender domain with Resend before sending production mail.

## Verify the production bundle

```sh
npm run typecheck
npm run build -- --webpack
```
