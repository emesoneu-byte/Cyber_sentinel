# Host CyberSentinel on Render (phone access)

After hosting you open one link on your phone, e.g. https://cybersentinel-xxxx.onrender.com

## 1. GitHub (required by Render)

1. Create a free GitHub account if needed.
2. Create a new repository (e.g. cybersentinel).
3. Upload this project folder to the repo (GitHub website "upload files" is fine).

## 2. Render

1. Go to https://render.com and sign up (GitHub login is easiest).
2. Dashboard → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Name:** cybersentinel
   - **Runtime:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance type:** Free

5. **Environment variables** (Add):

| Key | Value |
|-----|--------|
| NODE_ENV | production |
| JWT_SECRET | any long random string (32+ chars) |
| JWT_REFRESH_SECRET | another long random string |
| ADMIN_EMAIL | admin@example.com |
| ADMIN_PASSWORD | Admin123! |
| DB_PATH | ./data/cybersentinel.db |
| CORS_ORIGIN | (leave blank first; set to your Render URL after first deploy) |
| TRACKING_BASE_URL | https://YOUR-SERVICE.onrender.com/api/v1/track |

Optional SMTP (same as local):
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM

6. Click **Create Web Service** and wait for the build (5–10 minutes first time).

7. When live, open the URL Render gives you (https://….onrender.com).

8. Set CORS_ORIGIN to that exact URL and redeploy if login fails from the browser.

## 3. Phone

Open the Render URL in Chrome/Safari → sign in with admin@example.com / Admin123!

## Notes

- Free tier may **sleep** after inactivity; first open can take 30–60 seconds.
- SQLite on free tier may reset if the filesystem is ephemeral; add a persistent disk on a paid plan if you need data to survive forever.
- Appearing in **Google search** takes time and is optional; bookmark the link or type the URL. For the viva, the public link is enough.
