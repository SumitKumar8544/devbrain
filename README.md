# 🧠 DevBrain — B.Tech CSE Knowledge Vault & AI Study Copilot

> **A permanent, offline-first study companion designed specifically for Computer Science Engineers to store, master, and revise coursework, coding interview patterns, system design, and algorithms throughout their 4-year degree and career.**

---

## 🚀 Quick Start

The app is set up and running on your machine:

- **Frontend (Web App):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

To start manually from the root directory:
```bash
npm run dev
```
*(This launches both the Express backend and React Vite frontend concurrently with a single command!)*

---

## ✨ Features Built for Engineers & Students

### 1. 📚 4-Year B.Tech Semester & Subject Organization
- Pre-seeded with core engineering subjects:
  - **Data Structures & Algorithms (CS301)**
  - **Operating Systems (CS402)**
  - **Database Management Systems (CS404)**
  - **Computer Networks (CS501)**
  - **System Design & Distributed Systems (CS602)**
  - **Artificial Intelligence & Machine Learning (CS605)**
- Add custom subjects with custom semester levels (S1 to S8), color accents, and syllabus tags.

### 2. 📝 Engineering Note & Markdown System
- **Rich Markdown Formatting**: Headers, lists, task checklists, callout notes, and KaTeX-style math equations.
- **Multi-Language Code Snippets**: Multi-tab code snippets in **C++, Java, Python, SQL, JavaScript, Go, Rust, and C** with one-click **Copy Code** functionality.
- **Important Resource Links Bookmarks**: Direct categorized cards for **LeetCode Problems**, **GitHub Repos**, **YouTube Video Walkthroughs**, **Research Papers**, and **Official Documentation**.
- **Interactive Spaced Repetition Flashcards**: 3D flip-cards with Question/Answer pairs to test your active recall before exams and technical interviews.
- **Revision Status Badges**: Tag notes as `Draft`, `Revising`, `Exam Ready`, `Interview Ready`, or `Mastered`.

### 3. 🎨 Modern Glassmorphic Design & Dual Themes
- **Apple/macOS Inspired Glassmorphism**: Translucent frosted panels with ambient aurora background mesh.
- **Instant Light & Dark Mode**: One-click toggle in Navbar with persistent zero-flicker theme synchronization.
- **View Toggle & Sorting**: Switch between Responsive Grid and Compact List view, with multi-criteria sorting (Recent, Oldest, Title, Starred).

### 4. 🤖 Context-Aware AI Study Copilot
- **Note-Aware Reasoning**: The AI Copilot directly inspects the currently opened concept note, code snippet, and links.
- **1-Click Engineering Actions**:
  - 🧠 **Explain Concept Simply (ELIF5)**: Intuitive real-world analogies and under-the-hood operation.
  - 💻 **Generate Optimal Implementation**: Clean, commented code in C++, Java, or Python with asymptotic complexity analysis ($\mathcal{O}$ notation).
  - 🧪 **Quiz Me**: Generates 3 tricky exam or technical interview MCQs with answers.
  - 📝 **Extract Cheat Sheet**: Instant bullet-point revision sheet of formulas, edge cases, and rules.
  - 🐛 **Analyze Edge Cases & Bugs**: Identifies common pitfalls, null/overflow boundary cases, and concurrency hazards.
- **Direct Note Manipulation**: Click **"Insert into Note"** on any AI explanation or code snippet to instantly append it into your study note!
- Powered by Google Gemini 2.5 Flash API with intelligent offline fallback heuristics.

### 5. ☁️ MongoDB Atlas Cloud Authentication & Authorization
- **Primary Cloud Identity**: User registration and login credentials authenticated directly via **MongoDB Atlas**.
- **Secure Hashing**: Salted SHA-256 cryptographic password storage.
- **Offline / Local Fallback**: Fast local SQLite sync for high-performance relational queries.

### 6. 💳 3-Month Free Trial & Dual-Engine Payment Gateway
- **90-Day Free Trial**: Automatically initialized upon account registration with real-time countdown indicator in Navbar.
- **Graceful Paywall**: Existing notes and revision remain 100% accessible to read and export. Creating new notes, uploading files, and AI inference are gated upon trial expiration.
- **Dual Payment Gateway**:
  - **Live Stripe Checkout**: One-click hosted payment for Credit/Debit cards, Apple Pay, and Google Pay.
  - **Direct In-App Gateway**: 16-digit card brand detection (Visa/Mastercard/Amex), UPI & QR instant payment, Bank 3D Secure / OTP simulation, and printable VAT/tax invoices.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React-Markdown, Remark-GFM |
| **Backend** | Node.js 22, Express, CORS, Helmet, Dotenv, Stripe SDK, Mongoose |
| **Databases** | MongoDB Atlas (Cloud User Auth) + Native `node:sqlite` (Local Vault & Content) |
| **Storage** | Supabase Storage (Cloud attachments) + Local Disk Fallback |
| **AI Integration** | Google Gemini 2.5 Flash API + OpenAI GPT-4o fallback |

---

## 📂 Project Architecture

```
DevBrain/
├── package.json              # Root orchestrator with concurrently
├── server/
│   ├── package.json          # Express server dependencies
│   ├── data/                 # SQLite database storage (devbrain.sqlite)
│   └── src/
│       ├── index.js          # REST API routes (auth, notes, AI chat, billing, stripe)
│       ├── db.js             # Native SQLite schema & starter B.Tech data
│       ├── mongo.js          # MongoDB Atlas connection & User schema
│       └── ai.js             # Gemini AI Study Engine & local heuristics
└── client/
    ├── package.json          # React + Vite frontend
    ├── vite.config.ts        # Vite configuration with Tailwind CSS & API proxy
    ├── index.html            # Web entry point
    └── src/
        ├── types/            # TypeScript interfaces
        ├── services/api.ts   # REST API client
        ├── components/
        │   ├── Navbar.tsx             # Header, search, trial pill, theme switch
        │   ├── Sidebar.tsx            # Subject tracks, study categories, tag cloud
        │   ├── NoteCard.tsx           # Note grid card with snippet & link counts
        │   ├── NoteDetail.tsx         # Full study view (theory, code, links, flashcards)
        │   ├── NoteEditor.tsx         # Markdown & snippet builder with live preview
        │   ├── AICopilot.tsx          # Slide-out AI assistant with 1-click prompts
        │   ├── SubscriptionModal.tsx  # 4-stage payment gate (Stripe, Cards, UPI, Receipt)
        │   ├── SettingsModal.tsx      # Gemini API key, billing tab & Vault export/import
        │   ├── SubjectModal.tsx       # Custom subject creation modal
        │   └── DashboardStats.tsx     # Learning metrics & subject distribution
        ├── App.tsx           # Main application state and layout
        └── index.css         # Glassmorphism styling and theme variables
```
