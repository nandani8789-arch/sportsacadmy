# StrikeHub Academy OS

A full-stack starter website for the Dumka sports academy problem statement. Built with React + Vite, Express, MongoDB Atlas and WebAuthn passkeys.

## Screens included
1. Public landing page with sports photography and product introduction.
2. Login / create account page with a dedicated biometric sign-in area.
3. Dashboard with a prominent match-readiness message after login.
4. Players roster with search and add-player UI.
5. Sessions page with open, mark present/absent and close-session flow.
6. Matches page for fixtures and results.
7. Readiness page showing who meets the 75% attendance + 2 matches rule.

The interface is responsive and uses a consistent navy, lime and off-white visual theme.

## Run locally
Install Node.js LTS first (Node 20+ recommended).

```bash
npm install
```

Copy `.env.example` to `.env`, then add your MongoDB Atlas connection string and a long random JWT secret.

```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend health: http://localhost:5000/api/health

You can open the UI in demo mode without MongoDB. Demo login accepts an email and password and stores the demo user only in the browser. For real accounts and persistent data, configure MongoDB Atlas.

## Biometric / anti-proxy attendance
This project includes WebAuthn passkey registration and authentication API endpoints. The browser requests verification through the device's platform authenticator, such as Windows Hello, Touch ID or Android screen lock. Biometric templates are not uploaded to the server; the server stores a public-key credential.

To finish wiring passkey enrollment into the signed-in settings flow, call:
- `POST /api/webauthn/register/options` with a Bearer token
- `POST /api/webauthn/register/verify` with `{ "credential": <startRegistration result> }`

For sign-in, the UI already calls:
- `POST /api/webauthn/authenticate/options`
- `POST /api/webauthn/authenticate/verify`

**Important:** WebAuthn verifies control of a registered device credential. It does not prove a person is physically at the academy. For stronger attendance integrity, combine passkeys with coach-supervised check-in, a rotating session QR code, and server-side time/location policy. Do not treat a passkey alone as proof of physical presence.

## Important implementation notes
- The starter frontend uses sample roster/session/match data so the UI is immediately explorable.
- The Express API and Mongoose models are included. Connect the UI CRUD actions to the API before production use.
- The current demo login fallback is for local UI preview only. Remove it before deployment.
- Configure HTTPS and a real domain before deploying WebAuthn. For production, set `RP_ID` to your domain and `CLIENT_URL` to your HTTPS frontend origin.
- Add role-based API authorization and academy/player ownership checks before real-world use.
- Sports photos are loaded from Unsplash and need an internet connection.

## Suggested next build steps
1. Add a coach-managed player invitation / account linking flow.
2. Add QR + passkey + coach confirmation for attendance.
3. Connect player and match CRUD screens to the API.
4. Add scout-only filtered access and player-only self view.
5. Deploy frontend and backend, then configure the production WebAuthn domain.
