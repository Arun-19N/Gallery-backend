# Gallery Backend — Debugging & Deployment Documentation

**Project:** Gallery Backend (Node.js + Express + MongoDB + Mongoose)
**Deployment Platform:** Vercel
**Database:** MongoDB Atlas
**Repository:** `gallery-backend`

This document captures the full debugging journey for getting the Gallery Backend API running locally and deployed successfully on Vercel, including every error encountered, its root cause, and the exact fix applied. It's organized chronologically so it can be used as a reference for similar issues in future projects.

---

## Table of Contents

1. [Local MongoDB Connection Failure](#1-local-mongodb-connection-failure)
2. [Credential Exposure & Password Reset](#2-credential-exposure--password-reset)
3. [Root Cause: College WiFi Blocking DNS Lookups](#3-root-cause-college-wifi-blocking-dns-lookups)
4. [Vercel Deployment Crash — Generic 500 Error](#4-vercel-deployment-crash--generic-500-error)
5. [Module Not Found — File Casing Issues](#5-module-not-found--file-casing-issues)
6. [ReferenceError — Variable Casing Typo](#6-referenceerror--variable-casing-typo)
7. [Mongoose OverwriteModelError](#7-mongoose-overwritemodelerror)
8. [Recurring Casing Bug in a Second File](#8-recurring-casing-bug-in-a-second-file)
9. [Forgot to Sync Environment Variables After Password Reset](#9-forgot-to-sync-environment-variables-after-password-reset)
10. [Invalid MongoDB Connection String Scheme](#10-invalid-mongodb-connection-string-scheme)
11. [Final Working State](#11-final-working-state)
12. [Connecting the React Frontend](#12-connecting-the-react-frontend)
13. [Testing APIs with Postman](#13-testing-apis-with-postman)
14. [Key Lessons & Best Practices](#14-key-lessons--best-practices)

---

## 1. Local MongoDB Connection Failure

### Error
```
❌ Error connecting to MongoDB: Could not connect to any servers in your MongoDB
   Atlas cluster. One common reason is that you're trying to access the database
   from an IP that isn't whitelisted.
❌ Failed to connect to MongoDB. Server not started.
[nodemon] app crashed - waiting for file changes before starting...
```

### Initial Diagnosis
This message is MongoDB's generic fallback error for **any** failure to reach the cluster — not necessarily an IP whitelist problem specifically. The first step was to check the Atlas **Network Access → IP Access List**.

### What We Found
On checking the Atlas dashboard, `0.0.0.0/0` (allow access from anywhere) was **already active**, along with the current IP. This ruled out IP whitelisting as the actual cause and pointed toward a different root issue (covered in Section 3).

### Lesson
> Don't trust generic driver error messages at face value. Always verify the suggested cause directly (in this case, checking the Atlas Network Access panel) before assuming it's correct.

---

## 2. Credential Exposure & Password Reset

### What Happened
While debugging, the `.env` file was shared in plain text, including the live database username and password:
```
MONGO_URI=mongodb+srv://arunbot1920:ARUN8925@cluster0.6nbaw2k.mongodb.net/?appName=Cluster0
```

### Why This Matters
Any credential shared in chat, a screenshot, or committed to a public repo should be treated as **compromised** the moment it's exposed — regardless of whether anyone has actually misused it yet.

### Fix Applied
1. Went to **Atlas → Database Access → Database Users**
2. Selected the `arunbot1920` user → **Edit** → **Edit Password**
3. Set a new password
4. Updated the local `.env` file with the new password

### Lesson
> Never paste real credentials into chat tools, tickets, or shared docs. If it happens, rotate the credential immediately — treat exposure as a breach regardless of intent.

---

## 3. Root Cause: College WiFi Blocking DNS Lookups

### Error (the real one)
```
❌ Error connecting to MongoDB: queryTxt EREFUSED cluster0.6nbaw2k.mongodb.net
❌ Failed to connect to MongoDB. Server not started.
```

### Root Cause
`mongodb+srv://` connection strings rely on a **DNS TXT record lookup** to discover the cluster's actual hosts. `queryTxt EREFUSED` means the network's DNS server **actively refused** to resolve this lookup — a common restriction on college, corporate, and public WiFi networks for security reasons.

### Fix Applied
Changed the local machine's DNS servers to public DNS providers instead of the network's default:
- Preferred DNS: `8.8.8.8` (Google)
- Alternate DNS: `1.1.1.1` (Cloudflare)

**Windows:** Settings → Network & Internet → Change adapter options → right-click active connection → Properties → IPv4 → set DNS manually.

**Mac:** System Settings → Network → WiFi → Details → DNS → add `8.8.8.8` and `1.1.1.1`.

After changing DNS settings, the local server connected to MongoDB Atlas successfully.

### Alternative Fixes (if DNS override doesn't work)
- Use the **non-SRV connection string** format (`mongodb://host1:27017,host2:27017,.../`) from Atlas's "Drivers" connection tab — this avoids the SRV/TXT lookup entirely.
- Use a mobile hotspot or VPN to bypass the network's DNS restrictions entirely.

### Lesson
> If a connection error mentions DNS, SRV, or `queryTxt`, suspect the network itself before suspecting code or credentials — especially on restrictive networks like campus or corporate WiFi.

---

## 4. Vercel Deployment Crash — Generic 500 Error

### Error (as shown to the browser/Postman)
```
This Serverless Function has crashed.
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

### Why This Error Is Misleading
Vercel's public-facing error page is intentionally generic — it never reveals the actual cause to visitors. The real error only exists in the **Runtime Logs**.

### How We Found the Real Error
1. Vercel Dashboard → Project → **Deployments**
2. Click the relevant deployment
3. Open the **Logs** / **Runtime Logs** tab
4. Find the failing request, expand it to reveal the full stack trace

### Lesson
> Whenever you see `FUNCTION_INVOCATION_FAILED`, immediately go to the Vercel Runtime Logs — never try to diagnose from the public error page alone.

---

## 5. Module Not Found — File Casing Issues

### Error
```
Cannot find module '../model/user'
Require stack:
- /var/task/controllers/autoControllers.js
- /var/task/routes/authRoutes.js
- /var/task/server.js
```

### Root Cause
The actual model file was named `User.js` (capital **U**), but the import statement used lowercase:
```js
const User = require('../model/user');
```

This worked fine locally on **Windows** because Windows' filesystem is **case-insensitive** (`user.js` and `User.js` are treated as the same file). Vercel runs on **Linux**, which is **case-sensitive** — so the import silently failed only in production.

### Fix Applied
Corrected the import to match the file's exact casing:
```js
const User = require('../model/User');
```

### How to Catch All Instances at Once
Instead of fixing files one at a time as they surfaced, a project-wide search was used:
```bash
grep -rn "model/user" . --include=*.js -i
```
This lists every import of the model regardless of casing, allowing all mismatches to be found and fixed together.

### Lesson
> Always match import paths to file names **exactly**, including case — especially before deploying to Linux-based platforms (Vercel, most cloud servers) when developing on Windows or Mac.

---

## 6. ReferenceError — Variable Casing Typo

### Error
```
ReferenceError: userSchema is not defined
    at Object.<anonymous> (D:\...\model\User.js:66:65)
```

### Root Cause
While adding a fix to prevent the model from being re-compiled (see Section 7), the schema variable was referenced with the wrong case:
```js
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
```
But the actual schema variable declared earlier in the file was:
```js
const UserSchema = new mongoose.Schema({ ... });
```

### Fix Applied
Corrected the reference to match the actual variable name:
```js
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
```

### Lesson
> JavaScript variable names are case-sensitive. A single mismatched letter between declaration and usage will throw a `ReferenceError` at runtime, not a compile-time warning.

---

## 7. Mongoose OverwriteModelError

### Error
```
OverwriteModelError: Cannot overwrite `User` model once compiled.
    at Mongoose.model (...\node_modules\mongoose\lib\index.js:577:13)
```

### Root Cause
`mongoose.model('User', schema)` was being executed more than once for the same model name. This can happen when:
- The model file is required from multiple import paths that Node treats as separate module cache entries (often due to casing inconsistencies, see Section 5)
- `nodemon` restarts trigger re-registration without a guard clause

### Fix Applied
Added a guard so the model is only compiled once, reusing the existing compiled model on subsequent requires:
```js
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
```

### Lesson
> Always guard Mongoose model exports with `mongoose.models.<Name> || mongoose.model(...)` — this is a standard defensive pattern that prevents this class of error regardless of root cause.

---

## 8. Recurring Casing Bug in a Second File

### Error
```
Cannot find module '../model/user.js'
Require stack:
- /var/task/middleware/authMiddleware.js
- /var/task/routes/authRoutes.js
- /var/task/server.js
```

### Root Cause
The same casing mismatch from Section 5 was present in a **second file** (`middleware/authMiddleware.js`) that hadn't been checked yet:
```js
const User = require('../model/user.js'); // ❌ lowercase
```

### Fix Applied
```js
const User = require('../model/User'); // ✅ matches actual filename
```

This same bug then resurfaced a **third time** in `controllers/autoControllers.js`, which still had the old lowercase import even after the model file itself was fixed.

### Lesson
> A single casing bug often exists in multiple files across a codebase. Fix it everywhere in one pass using a project-wide search (see Section 5's `grep` command) instead of waiting for each file to crash individually in production.

---

## 9. Forgot to Sync Environment Variables After Password Reset

### Error
Same generic `FUNCTION_INVOCATION_FAILED`, with the runtime log showing a MongoDB authentication/connection failure.

### Root Cause
After resetting the MongoDB Atlas password (Section 2), the local `.env` file was updated — but **Vercel's own Environment Variables** (set independently in the dashboard) still held the **old, now-invalid** password. Vercel does not read `.env` files from your repo (and shouldn't, since they're typically gitignored) — environment variables must be set manually in the Vercel dashboard.

### Fix Applied
1. Vercel Dashboard → Project → **Environment Variables** (sidebar, between CDN and Domains)
2. Direct URL shortcut:
   ```
   https://vercel.com/<your-team>/<project>/settings/environment-variables
   ```
3. Edited `MONGO_URI` to the current, correct connection string
4. **Redeployed manually** — Deployments tab → 3-dot menu on latest deployment → **Redeploy**
   *(Note: changing an environment variable does **not** automatically restart existing deployments — a redeploy is required.)*

### Lesson
> Local `.env` and Vercel's dashboard environment variables are two completely separate stores. Any credential rotation must be applied in **both** places, and Vercel requires a manual redeploy to pick up new variable values.

---

## 10. Invalid MongoDB Connection String Scheme

### Error
```
❌ Error connecting to MongoDB: Invalid scheme, expected connection string to
   start with "mongodb://" or "mongodb+srv://"
```

### Root Cause
When pasting the new connection string into Vercel's Environment Variables field, the value was malformed — most likely due to one of:
- Extra quotation marks accidentally included (`"mongodb+srv://..."`)
- A leading space before `mongodb+srv://`
- Stray characters from a copy-paste

### Fix Applied
1. Opened the `MONGO_URI` variable in Vercel
2. Cleared the value field completely
3. Re-entered the connection string carefully, ensuring it started with exactly `mongodb+srv://` with no surrounding quotes or whitespace
4. Saved and redeployed

### Lesson
> When pasting connection strings or secrets into dashboard fields, always verify the value starts and ends exactly as expected — invisible whitespace or stray quote characters are a common, easy-to-miss cause of "invalid format" errors.

---

## 11. Final Working State

After all fixes were applied and pushed to GitHub (`git push origin main`), the Vercel deployment built successfully and the API responded correctly:

```
API is running...
```

Confirmed working via direct browser visit to the deployment URL and via Postman requests to actual API routes.

---

## 12. Connecting the React Frontend

With the backend live and stable, the next step was preparing to connect it to a React frontend running locally.

### Step 1 — Enable CORS on the Backend
Since the frontend (`localhost:3000`) and backend (`https://gallery-backend-five.vercel.app`) are different origins, CORS must be explicitly enabled:

```bash
npm install cors
```

```js
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app'],
  credentials: true
}));
```

### Step 2 — Store the Backend URL as an Environment Variable in React
`.env` (in the React project root):
```
REACT_APP_API_URL=https://gallery-backend-five.vercel.app
```
*(Restart the React dev server after adding — env vars only load on startup. Vite projects use a `VITE_` prefix instead of `REACT_APP_`.)*

### Step 3 — Make API Calls
```bash
npm install axios
```

```js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const loginUser = async (email, password) => {
  try {
    const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    return res.data;
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
};
```

### Step 4 — Store and Send the JWT Token
```js
// After successful login:
localStorage.setItem('token', res.data.token);

// On protected requests:
const token = localStorage.getItem('token');
const res = await axios.get(`${API_URL}/api/auth/profile`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 13. Testing APIs with Postman

### Register
- **Method:** `POST`
- **URL:** `https://gallery-backend-five.vercel.app/api/auth/register`
- **Body (raw → JSON):**
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "test123"
}
```

### Login
- **Method:** `POST`
- **URL:** `https://gallery-backend-five.vercel.app/api/auth/login`
- **Body (raw → JSON):**
```json
{
  "email": "test@example.com",
  "password": "test123"
}
```
- Copy the returned JWT token for use in protected routes.

### Protected Route
- **Method:** `GET`
- **URL:** `https://gallery-backend-five.vercel.app/api/auth/profile`
- **Headers:** `Authorization: Bearer <token>`

### File Upload (Gallery)
- **Method:** `POST`
- **URL:** e.g. `https://gallery-backend-five.vercel.app/api/gallery/upload`
- **Body:** `form-data` → key `image`, type **File** → select file
- **Headers:** `Authorization: Bearer <token>` (if protected)

---

## 14. Key Lessons & Best Practices

| # | Lesson |
|---|--------|
| 1 | Generic error messages (especially from MongoDB drivers and Vercel) often don't reflect the real cause — always check the actual logs/dashboards before assuming. |
| 2 | Never share real credentials in chat, tickets, or commits. Rotate immediately if exposed. |
| 3 | `queryTxt EREFUSED` / SRV connection failures usually point to network-level DNS blocking, common on restrictive WiFi. Overriding DNS to `8.8.8.8` / `1.1.1.1` is a fast fix. |
| 4 | Windows/Mac filesystems are case-insensitive; Linux (and therefore Vercel) is case-sensitive. Always match `require()`/`import` paths to file names exactly, including case. |
| 5 | Guard Mongoose model exports with `mongoose.models.X || mongoose.model('X', schema)` to prevent `OverwriteModelError` on hot reloads or duplicate requires. |
| 6 | Local `.env` files and Vercel's dashboard Environment Variables are separate and must be kept in sync manually. |
| 7 | Environment variable changes in Vercel require a manual redeploy to take effect. |
| 8 | When pasting secrets into dashboard fields, double-check for stray quotes/whitespace that can break the expected format. |
| 9 | A single bug pattern (e.g. a casing mismatch) often recurs across multiple files — search the whole codebase at once (`grep -rn`) rather than fixing files one at a time as they fail. |
| 10 | CORS must be explicitly configured on the backend before a frontend on a different origin (e.g. `localhost:3000`) can successfully call it. |

---

*Document prepared as a reference for the Gallery Backend project's debugging and deployment process.*
