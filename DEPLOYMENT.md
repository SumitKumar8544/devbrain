# 🚀 DevBrain Deployment Guide

DevBrain can be deployed in **two ways**:
1. **Separated Deployment (Recommended):** Frontend on **Vercel** + Backend API on **Render**.
2. **Unified Single-Service Deployment:** Entire full-stack app on **Render** as a single service.

---

## 🌟 Option 1: Separated Deployment (Vercel Frontend + Render Backend)

This is the standard modern cloud architecture: Vercel provides lightning-fast edge CDN delivery for your React UI, while Render runs your Express + MongoDB + AI API.

### Part 1: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository: `SumitKumar8544/devbrain`.
3. Configure the service settings:
   - **Name:** `devbrain-api` (or any name you prefer)
   - **Region:** Choose the region closest to you (e.g., Singapore, Frankfurt, Oregon)
   - **Branch:** `main`
   - **Root Directory:** `server` *(Important!)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PORT` | `5000` | Port for Express |
   | `CLIENT_URL` | `*` | Or your Vercel domain once deployed |
   | `GEMINI_API_KEY` | *(your Gemini API key)* | Required for Gemini AI Copilot |
   | `OPENAI_API_KEY` | *(your OpenAI API key)* | Optional for OpenAI GPT-4o fallback |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cloud authentication |
   | `SUPABASE_URL` | `https://fjqgmmxpzmtzfzxvvymk.supabase.co` | Supabase Cloud Storage |
   | `SUPABASE_KEY` | *(your publishable key)* | Supabase API key |
   | `SUPABASE_BUCKET`| `vault` | Bucket name (set to Public in Supabase) |
5. Click **Create Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://devbrain-api.onrender.com`).

---

### Part 2: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Import your GitHub repository: `SumitKumar8544/devbrain`.
3. In the project configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `client` *(Important!)*
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)
4. Under **Environment Variables**, add:
   | Key | Value | Example |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | Your Render backend URL | `https://devbrain-api.onrender.com` |
5. Click **Deploy**.
6. Done! Your frontend is now live with global edge caching and automatic SSL (e.g., `https://devbrain.vercel.app`).

*(Optional security step: In Render -> Environment Variables, change `CLIENT_URL` from `*` to your new Vercel URL `https://devbrain.vercel.app`).*

---

## 📦 Option 2: Unified Deployment on Render (Single Web Service)

If you prefer keeping everything in a single free service on Render:

1. In Render, create a **Web Service** connected to your repo.
2. Leave **Root Directory** blank (uses root).
3. Set:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. Add the environment variables (`GEMINI_API_KEY`, `MONGODB_URI`, `SUPABASE_URL`, etc.).
5. Render builds both client and server, and Express serves the React app from `client/dist`.

---

## 🛠️ Local Development

To run both frontend and backend locally with live hot-reloading:

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend concurrently
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
