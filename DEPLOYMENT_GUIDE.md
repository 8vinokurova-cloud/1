# 🚀 Complete Production Deployment & Server Guide (100% Free / 0$)

This guide details how to launch and run the **Design Studio Luxury Platform** locally, on Vercel, or on Render with full backend, persistent database, media uploads, and email dispatch.

---

## 🏷️ Selected Domain Priorities on Vercel:

1. **`design-studio`** ➔ `https://design-studio.vercel.app` *(Primary)*
2. **`luxe-design`** ➔ `https://luxe-design.vercel.app` *(Alternative 1)*
3. **`event-design`** ➔ `https://event-design.vercel.app` *(Alternative 2)*
4. **`gala-design`** ➔ `https://gala-design.vercel.app` *(Alternative 3)*

---

## ⚡ Option 1: 1-Click Launch on Windows (Local Server)

Simply double-click the **`start-server.bat`** file in the project folder.

It will automatically:
1. Detect Node.js.
2. Initialize the server on **`http://localhost:3000`**.
3. Open **`http://localhost:3000/admin.html`** in your browser.

---

## 🌐 Option 2: 1-Click Free Deployment on Vercel (Global Online Access)

1. Sign up for free at [Vercel.com](https://vercel.com) (via GitHub or Google).
2. Upload this project folder to your [GitHub.com](https://github.com) repository.
3. In Vercel, click **«Add New... ➔ Project»** and select your repository.
4. Set the **Project Name** according to your priority:
   - Try **`design-studio`** first. If occupied, try **`luxe-design`**, **`event-design`**, or **`gala-design`**.
5. Click **«Deploy»**.
6. In ~30 seconds, your website and serverless APIs are live worldwide:
   - **Public Site:** `https://design-studio.vercel.app/`
   - **Admin Studio:** `https://design-studio.vercel.app/admin.html`
   - **Multi-Tenant Event Example:** `https://design-studio.vercel.app/?event=victoria-25`

---

## 🖥️ Option 3: 24/7 Dedicated Server on Render.com (100% Free)

1. Sign up for free at [Render.com](https://render.com).
2. Click **«New ➔ Web Service»** and connect your GitHub repository.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Click **«Create Web Service»**.
6. Your permanent Node.js Express server with persistent file uploads and database will be online 24/7.

---

## 👑 How the Multi-Tenant Platform Works:

1. **Super Admin (You)**:
   - Open `/admin.html` and log in with your credentials (`admin@luxury.com` / `superadmin123`).
   - Switch between events or click **`[ + New Site ]`** to spawn a new celebration website (e.g. `anna-25`).
   - Copy the 1-Click **Magic Link** to send to the event host:
     `https://design-studio.vercel.app/admin.html?invite=token_xyz&event=anna-25`

2. **Event Host**:
   - Opens the Magic Link ➔ sets their password ➔ customizes their text, photos, and music.

3. **VIP Guests**:
   - Open the invitation link: `https://design-studio.vercel.app/?event=anna-25`
   - Break the gold wax seal ➔ submit VIP RSVP in 10 seconds.
   - Receive a holographic 3D ticket pass with instant image download!
