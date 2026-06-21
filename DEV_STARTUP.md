# Political Fantasy — Dev Startup Sheet

Quick steps to get the app running each time you come back. You'll use
**2 terminals** normally, or **3** when working on Stripe payments.

Project root: `C:\Users\tamsl\dev\projects\political-fantasy`

---

## 0. Before you start

- Make sure **PostgreSQL is running.** On Windows it usually auto-starts.
  If the backend later errors about a database connection, this is the first thing to check.

---

## 1. Terminal 1 — Backend (FastAPI on port 8080)

```
cd C:\Users\tamsl\dev\projects\political-fantasy\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8080
```

- You should see `(venv)` appear after activating — if not, the next command will fail
  with a "module not found" error.
- Success looks like: `Uvicorn running on http://127.0.0.1:8080`.
- Leave this window running.

---

## 2. Terminal 2 — Frontend (React / Vite)

```
cd C:\Users\tamsl\dev\projects\political-fantasy\frontend-app
npm run dev
```

- Success looks like: `Local: http://localhost:5173/`.
- Leave this window running.

---

## 3. Terminal 3 — Stripe webhook (ONLY when working on payments)

Skip this unless you're testing the upgrade/checkout flow.

```
stripe listen --forward-to localhost:8080/payments/webhook
```

- Leave it running while testing. If it prints a new `whsec_...` value, update
  `STRIPE_WEBHOOK_SECRET` in `backend/.env` and restart Terminal 1.

---

## 4. Open the app

Go to **http://localhost:5173/** in your browser and log in.

---

## To stop everything

Press **Ctrl + C** in each terminal window.

---

## Quick troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `'uvicorn' is not recognized` or "module not found" | venv not activated — run `venv\Scripts\activate` first |
| `Error loading ASGI app. Attribute ... not found` | Typo in the command — it must be `main:app` |
| App loads but login / data calls fail | Frontend isn't pointing at port 8080. Confirm `frontend-app/.env` has `VITE_API_URL=http://localhost:8080`, then restart Terminal 2 |
| Backend errors on database connection | PostgreSQL isn't running |
| Premium upgrade pays but badge never appears | Terminal 3 (`stripe listen`) isn't running, or `STRIPE_WEBHOOK_SECRET` is stale — restart Terminal 1 after updating it |
| Need to run git commands | Open a **separate** terminal — don't use the ones running your servers (Ctrl+C would stop them) |

---

## Reminders

- Secrets live in `backend/.env` (which is gitignored) — never commit them.
- Use Stripe **test mode** keys (`sk_test_...`) while developing.
- Frontend env vars are public — never put secret keys in anything prefixed `VITE_`.
