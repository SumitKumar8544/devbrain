# 🧠 DevBrain — B.Tech CSE Knowledge Vault & AI Study Copilot

> **A permanent, offline-first study companion designed specifically for Computer Science Engineers to store, master, and revise coursework, coding interview patterns, system design, and algorithms throughout their 4-year degree and career.**

---

## 🚀 Quick Start

The app is already set up and running on your machine:

- **Frontend (Web App):** [http://localhost:5174](http://localhost:5174) (or [http://localhost:5173](http://localhost:5173))
- **Backend API:** [http://localhost:5000](http://localhost:5000)

To start manually in the future from the root directory:
```bash
npm run dev
```
*(This launches both the Express backend and React Vite frontend concurrently with a single command!)*

---

## ✨ Features Built for B.Tech Computer Science Engineers

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
- **Interactive Spaced Repetition Flashcards**: 3D flip-cards with Question/Answer pairs to test your active recall before university exams and technical interviews.
- **Revision Status Badges**: Tag notes as `Draft`, `Revising`, `Exam Ready`, `Interview Ready`, or `Mastered`.

### 3. 🤖 Context-Aware AI Study Copilot
- **Note-Aware Reasoning**: The AI Copilot directly inspects the currently opened concept note, code snippet, and links.
- **1-Click Engineering Actions**:
  - 🧠 **Explain Concept Simply (ELIF5)**: Intuitive real-world analogies and under-the-hood operation.
  - 💻 **Generate Optimal Implementation**: Clean, commented code in C++, Java, or Python with asymptotic complexity analysis ($\mathcal{O}$ notation).
  - 🧪 **Quiz Me**: Generates 3 tricky university exam or technical interview MCQs with answers.
  - 📝 **Extract Cheat Sheet**: Instant bullet-point revision sheet of formulas, edge cases, and rules.
  - 🐛 **Analyze Edge Cases & Bugs**: Identifies common pitfalls, null/overflow boundary cases, and concurrency hazards.
- **Direct Note Manipulation**: Click **"Insert into Note"** on any AI explanation or code snippet to instantly append it into your study note!
- **Gemini 2.5 Flash + Offline Mode**:
  - Works out of the box in intelligent offline mode.
  - Enter your free **Google Gemini API Key** in **Settings (⚙️)** to unlock real-time Gemini 2.5 Flash live reasoning!

### 4. 🔒 100% Privacy & 4-Year Long-Term Data Safety
- **Local SQLite Database**: All notes, links, flashcards, and settings are stored locally in `server/data/devbrain.sqlite` using Node.js 22's native SQLite engine.
- **One-Click Vault Export**: Click **Export Vault (JSON)** in Settings to download your entire knowledge base in a single file to backup to GitHub or Google Drive.
- **One-Click Restore**: Easily import your backup JSON file anytime.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React-Markdown, Remark-GFM |
| **Backend** | Node.js 22, Express, CORS, Dotenv, Native `node:sqlite` (Zero external native build dependencies) |
| **Database** | SQLite (`server/data/devbrain.sqlite`) with schema migration & pre-seeded CSE notes |
| **AI Integration** | Google Gemini 2.5 Flash API with intelligent offline fallback engine |

---

## 📂 Project Architecture

```
New folder/
├── package.json              # Root orchestrator with concurrently
├── server/
│   ├── package.json          # Express server dependencies
│   ├── data/                 # SQLite database storage (devbrain.sqlite)
│   └── src/
│       ├── index.js          # REST API routes (subjects, notes, AI chat, backups)
│       ├── db.js             # Native SQLite schema & starter B.Tech data
│       └── ai.js             # Gemini AI Study Engine & local heuristics
└── client/
    ├── package.json          # React + Vite frontend
    ├── vite.config.ts        # Vite configuration with Tailwind CSS & API proxy
    ├── index.html            # Web entry point
    └── src/
        ├── types/            # TypeScript interfaces
        ├── services/api.ts   # REST API client
        ├── components/
        │   ├── Navbar.tsx         # Header, search, semester filters, action bar
        │   ├── Sidebar.tsx        # Subject tracks, study categories, tag cloud
        │   ├── NoteCard.tsx       # Note grid card with snippet & link counts
        │   ├── NoteDetail.tsx     # Full study view (theory, code, links, flashcards)
        │   ├── NoteEditor.tsx     # Markdown & snippet builder with live preview
        │   ├── AICopilot.tsx      # Slide-out AI assistant with 1-click prompts
        │   ├── SettingsModal.tsx  # Gemini API key & Vault export/import
        │   ├── SubjectModal.tsx   # Custom subject creation modal
        │   └── DashboardStats.tsx # Learning metrics & subject distribution
        ├── App.tsx           # Main application state and layout
        └── index.css         # Tailwind CSS styling and theme
```
