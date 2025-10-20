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


This is shud be a major requirements dat if the frontend app/ device tracking is not there den the otp generation will not be possible and then. 

Have it at the back of ur mind that we r moving away from mobishastra and going directly to the SMS provider. 
We are getting directly from MTN and not third party like mobishastra. 