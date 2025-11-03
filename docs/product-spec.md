# Personal OS — Focus & Flow
_A hybrid GTD × Ivy Lee × Kanban desktop app for daily planning, deep work, and weekly reviews._

## 0) Context & Goals
- User: software developer & grad student; hybrid workflow; peak focus 09:00–12:00; prefers hybrid time-blocking + Kanban; tools: Todoist, HackMD, GitHub, Gmail.
- Near-term outcomes (3–6 months):
  - IELTS Writing retake on **2025-11-25** → raise writing from 5.5 to ≥6.5.
  - Grad applications/paperwork (pre-offer secured; more docs to prepare).
  - Fitness: body fat 21% → 15%, muscle 31.2kg → 33kg.
- Constraints: variable office environment; concentration challenges; protect sleep; office hours flexible.

## 1) Product Scope (v1)
### 1.1 Daily Start (7–10 min)
- Capture inbox (GTD), Clarify (2-minute rule), pick **Ivy-6**, place 2–3 focus blocks (default Pomodoro 25/5), start with the “frog” in 09:00–10:30.

### 1.2 Weekly Review (20–40 min)
- Empty inboxes → clarify → organize.
- Re-score via Eisenhower Matrix; schedule “important/not urgent”.
- Reserve next week’s deep-work blocks first.

### 1.3 Kanban Flow (Hybrid)
- Columns: **Backlog → Ready → Doing (WIP=1–2) → Review/Blocked → Done**.
- Pull system; enforce WIP in **Doing**; optional “Next/Ready” buffer.

### 1.4 Goal Packs
- **IELTS Writing**: session template (Outline 5’ → Draft 25’ → Rubric 10’ → Error log → Next fix); weekly full mock.
- **Applications/Paperwork**: program cards with deadlines; SOP/CV/Refs subtasks; shallow admin queue.
- **Fitness**: schedule presets (Mon/Wed/Fri strength; Tue/Sat cardio/mobility); simple metrics log.

### 1.5 Non-Goals (v1)
- No multi-user; no embedded email; minimal integrations (adapters later).

## 2) UX
- **Focus** screen (current block, timer, “frog”, checklist).
- **Board** (Kanban with WIP; drag-drop; column caps).
- **Review** (daily & weekly scripts; Eisenhower quick-tag grid).
- Global quick-capture; keyboard-first; distraction toggle.

## 3) Domain Model
- **Task** `{id,title,notes,context:@deep|@shallow,estPoms,due,priority,status}`
- **Board** `{columns:[{id,name,wipLimit}]}` with pull transitions.
- **Ritual** `{id,name,steps[],duration,checklist[]}`
- **Session** `{taskId,start,duration,mode:pomodoro|block,outcome}`
- **GoalPack** `{id,name,templates,metrics}`

## 4) Architecture
```
personal-os/
├─ apps/desktop/        # Electron shell (alt: Tauri)
│  ├─ app/              # main process, preload, menus
│  └─ renderer/         # UI (React/Vite suggested)
├─ packages/
│  ├─ core/             # domain + services
│  ├─ engine/           # rituals, timers, WIP enforcement
│  ├─ storage/          # SQLite/lowdb
│  └─ adapters/         # (later) Todoist/Gmail/GitHub/HackMD
├─ configs/             # goals.yml, rituals.yml
├─ specs/               # feature specs & acceptance criteria
└─ docs/
```

## 5) Success Metrics
- Daily Start completion rate ≥ 80% of workdays.
- ≥ 5 deep sessions/week (≥ 60 min each) until IELTS date.
- Weekly Review completion rate ≥ 80%.
- WIP violations/day ≤ 1 on average.
- IELTS writing rubric: weekly average score trend ↑; error log items closed.

## 6) Build & Release (high-level)
- Default track: **Electron + electron-builder** (targets: `dmg`, `nsis`).
- macOS builds on macOS with Developer ID signing + notarization.
- Windows builds on Windows with code signing (EV recommended).
- Scripts:
  - `npm run dev` / `build` / `dist`
  - `build-mac` → `electron-builder --mac`
  - `build-win` → `electron-builder --win`

## 7) Risks & Mitigations
- Concentration variability → enforce WIP, small tickets, gentle defaults.
- Over-scheduling → cap Ivy-6; 80% calendar utilization max; buffers between blocks.
- Packaging friction → per-OS runners; follow platform signing guides.

## 8) Roadmap
- **v0.1**: Focus screen + timers; Kanban with WIP; Daily Start.
- **v0.2**: Weekly Review; Eisenhower quick grid; exports.
- **v0.3**: Goal Packs; adapters.
- **v1.0**: Signed `.exe` + `.dmg` releases with auto-update channel.
