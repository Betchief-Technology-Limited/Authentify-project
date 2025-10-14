BETCHIEF KYC / OTP / EMAIL API

Stack: Node.js + Express (ES modules), MongoDB (Mongoose), Redis (ioredis)

Quick start:
1. cp .env.example .env and fill values
2. npm install
3. npm run dev

Endpoints:
- Admin login: POST /api/auth/login
- Activate live keys (admin): POST /api/admin/activate-live/:orgId
- Initiate payment (org): POST /api/v1/payment/initiate
- Payment webhooks: /api/v1/payment/paystack/callback, /flutterwave/callback, /paypal/return

Notes:
- Test keys created by default for organizations; live keys inactive until activated.
- Replace KYC adapter stubs with real provider endpoints when ready.
