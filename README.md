# Personal OS — Focus & Flow
_A hybrid GTD × Ivy Lee × Kanban desktop app for daily planning, deep work, and weekly reviews._

## Vision
Build a distraction-minimal desktop app that:
- Guides a **5–10 min “Daily Start”** ritual,
- Enforces **Ivy-Lee six tasks** + **WIP limits**,
- Protects **09:00–12:00** as deep-work time,
- Supports **IELTS writing (exam: 2025-11-25)**, **application paperwork**, **fitness tracking**,
- Exports a clean **Daily/Weekly log**.

Designed to be created inside **Kiro IDE** (spec-driven) and packaged for **Windows (.exe)** and **macOS (.dmg)**.

---

## Product Scope

### Core “Daily Start” (7–10 min)
1. **Capture (GTD)** inbox sweep.  
2. **Clarify (GTD)** w/ 2-minute rule.  
3. **Prioritize (Ivy Lee)**: pick **exactly six** tasks and order them.  
4. **Time-plan**: block first 2–3 focus blocks; default 25/5 **Pomodoro**.  
5. **Start with the Frog** during **09:00–10:30**.

### Weekly Review (20–40 min)
- Empty all inboxes → clarify → organize.  
- Re-score tasks via **Eisenhower Matrix**; schedule “important/not urgent”.  
- Reserve next week’s **deep-work blocks** first.

### Kanban Flow
Columns: **Backlog → Ready → Doing (WIP=1–2) → Review/Blocked → Done**.  
Pull-based; never exceed WIP in **Doing**.

### Goal Packs (initial)
- **IELTS Writing** (Task 1/2 timers, error log, weekly mock).  
- **Applications/Paperwork** (program cards; SOP/refs/CV subtasks).  
- **Fitness** (strength schedule + simple metrics log).

---

## Non-Goals (v1)
- No multi-user or realtime collaboration.  
- No in-app email client; rely on external apps and one-click capture.

---

## High-Level Architecture

```
personal-os/
├─ apps/
│  └─ desktop/                 # Electron shell (or Tauri alt)
│     ├─ app/                  # Preload, main process, menus
│     └─ renderer/             # UI (React/Vite suggested)
├─ packages/
│  ├─ core/                    # Domain logic: tasks, boards, reviews
│  ├─ engine/                  # Ritual runner (Daily Start, Weekly Review)
│  ├─ adapters/                # Optional integrations (Todoist, Gmail, GitHub, HackMD)
│  └─ storage/                 # Persistence (SQLite/JSON/kv)
├─ configs/
│  ├─ goals.yml                # IELTS/applications/fitness configs
│  └─ rituals.yml              # Morning/weekly scripts
├─ docs/
│  ├─ product-spec.md
│  ├─ rituals.md
│  └─ research.md
├─ specs/                      # Kiro spec-driven artifacts
│  ├─ feature-*.spec.md
│  └─ acceptance-criteria.md
├─ scripts/                    # Build/release helpers
└─ README.md
```

**Why Electron?** Proven path to **.exe** and **.dmg** using **electron-builder**; large ecosystem and docs.  
**Alt: Tauri.** Smaller footprint; first-class Windows installer and macOS .dmg docs, but signing/setup differs.

---

## Detailed Specs

### 1) Domain Model
- **Task**: `id, title, notes, context(@deep/@shallow), estPomodoros, due, priority, status`  
- **Board**: columns w/ **WIP limits**; transitions enforce pull rules.  
- **Ritual**: reusable script of steps (prompts + timers + checks).  
- **Session**: a timed block (pomodoro or fixed block) with outcome notes.  
- **GoalPack**: presets for IELTS / Applications / Fitness (templates + dashboards).

### 2) Daily Start Engine
- Load **inbox**, run **clarify** (2-minute rule: instant action/deferral).  
- Generate **Ivy-6** list; nudge if >6.  
- Auto-place 1–2 deep-work sessions in 09:00–12:00 window by default.  
- Display **frog** at top and lock WIP=1 during first focus block.

### 3) Eisenhower & Pareto Guards
- Inline matrix quick-tagging: `#DoNow`, `#Schedule`, `#Delegate`, `#Delete`.  
- Pareto prompt: “Is this in the vital 20%?” before accepting new tasks.

### 4) IELTS Pack
- **Session template**: Prompt → 5-min outline → 25-min draft → 10-min rubric self-check → Error log → “Next fix”.  
- **Weekly**: mixed Task1/Task2 mock + review.

### 5) Applications Pack
- **Program cards** with deadlines and doc checklist (SOP/CV/Refs/Transcripts).  
- “Shallow admin” queue (email/upload/scheduling) kept out of deep slots.

### 6) Fitness Pack
- **Strength schedule** (Mon/Wed/Fri), **cardio/mobility** (Tue/Sat), simple metrics (BF%, muscle kg).  
- Evening cognitive load kept light to protect sleep.

---

## UX Notes
- Minimal UI; single **Focus** screen for current block, plus **Board** and **Review**.  
- Keyboard-first; global quick-capture.  
- “No-distraction mode” automatically mutes notifications during deep blocks.

---

## Build & Release

### Toolchain (default track: Electron + electron-builder)
- **electron-builder** packages Windows/macOS/Linux with auto-update support. Configure via `package.json#build` or `electron-builder.yml`.

**OS reality check:**  
- Build **signed** `.dmg` on **macOS** (Apple Developer ID; notarization recommended).  
- Build **signed** Windows installer (`.exe`/`.msi`) on **Windows** (use SignTool or CI service).  
- Cross-OS builds are limited/fragile; standard practice is use **per-OS runners** or CI (e.g., macOS for dmg, Windows for exe).

#### Local Dev (inside Kiro IDE)
Kiro gives you spec-driven workflows and a VS Code-like environment. Use Kiro for planning/specs and run the same npm/yarn scripts in its terminal.

#### Scripts
```
# from apps/desktop
npm run dev               # run renderer + electron
npm run build             # bundle app (renderer)
npm run dist              # electron-builder: produce installers
```

**electron-builder minimal config**
```json
{
  "name": "personal-os",
  "version": "0.1.0",
  "build": {
    "appId": "com.yourname.personalos",
    "mac": { "target": ["dmg"], "category": "public.app-category.productivity" },
    "win": { "target": ["nsis"], "publisherName": "Your Legal Name" },
    "files": ["dist/**", "app/**"]
  }
}
```

#### Code Signing & Notarization (must-know)
- **macOS**: Sign with Developer ID Application cert, then notarize and optionally staple.  
- **Windows**: Sign with a code-signing certificate (EV recommended for SmartScreen).

> Notes and gotchas: building Windows installers on macOS is unreliable; prefer native runners (or CI with per-OS workers).

### Alternative Track: Tauri
If you prefer Tauri (Rust backend, smaller binaries):
- Build Windows installer via `tauri build` on Windows.
- Build macOS `.dmg` on macOS.

---

## Project Setup Checklist

1) **Kiro IDE**
   - Install Kiro, create project, add `specs/` and `docs/` folders, write initial specs.

2) **Initialize repo**
   - Workspaces: `apps/desktop`, `packages/*`.  
   - Add `electron-builder` + scripts.

3) **Specs to create (in `/specs`)**
   - `feature-daily-start.spec.md` — steps, timers, prompts, acceptance tests.  
   - `feature-kanban-wip.spec.md` — column rules + WIP enforcement.  
   - `feature-eisenhower.spec.md` — quick tag UX + scheduling behavior.  
   - `feature-goalpack-ielts.spec.md` — session template, logs, weekly mock.  
   - `feature-goalpack-apps.spec.md` — program cards, checklists, deadlines.  
   - `feature-goalpack-fitness.spec.md` — schedule + metrics log.

4) **Configs (in `/configs`)**
   - `rituals.yml` — Daily Start, Weekly Review scripts.  
   - `goals.yml` — IELTS date (2025-11-25), program targets, fitness targets.

5) **First Milestone (M1)**
   - UI frame (Electron), Daily Start wizard, Board with WIP, timers.

6) **Second Milestone (M2)**
   - Goal Packs, exports, and signing + release pipelines.

---

## Roadmap
- **v0.1**: Local rituals, board, timers, logs.  
- **v0.2**: Export daily/weekly summaries.  
- **v0.3**: Optional adapters (Todoist/Gmail/GitHub/HackMD) as `packages/adapters/`.  
- **v1.0**: Signed installers for macOS + Windows, auto-update channel.

---

## FAQ

**Can I build both installers from one OS?**  
You can attempt cross-compiles, but signing and reliability are better when you build on each target OS or via CI.

**Do I have to notarize the mac app?**  
Yes—recommended to avoid Gatekeeper prompts.

**Do I need to code-sign on Windows?**  
Yes—use SignTool or a CI service. EV certs improve SmartScreen reputation.
