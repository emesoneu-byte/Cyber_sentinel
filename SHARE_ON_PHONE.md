# Open CyberSentinel on any phone (simple)

You need **two terminals on your PC**. The phone only opens a **link**.

## Steps

### 1. Start the backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Create a public link (third terminal)
```bash
cd frontend
npm run share
```

You will see a URL like:
```text
https://something.loca.lt
```

### 4. On the phone
Open that **https://…loca.lt** link in Chrome/Safari.

- Works on **any network** (phone data or Wi‑Fi)
- No IP address lookup
- No same-Wi‑Fi requirement

If the tunnel asks for a password in the browser, it shows the PC public IP once — accept/continue, then the app loads.

## Alternative (Cloudflare tunnel)
```bash
cd frontend
npm run share:cf
```
Use the `https://….trycloudflare.com` link on the phone.

## Permanent link (for Google / supervisors)
Deploy frontend (Vercel/Netlify) + backend (Render/Railway). Then the link always works without your PC staying on.
