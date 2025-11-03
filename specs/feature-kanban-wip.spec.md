# Feature: Kanban Board with WIP Limits

## Intent
Stabilize flow and attention by limiting Work-In-Progress in **Doing**.

## Acceptance Criteria
1. Columns: Backlog, Ready, Doing, Review/Blocked, Done.
2. WIP limit configurable per column; default **Doing=2**.
3. When WIP is reached, new pulls into **Doing** are blocked with an inline tip.
4. Drag-drop supports only **pull** transitions (rightward) unless explicitly overridden.
5. “Ready” acts as a small buffer; replenishment from Backlog is manual.
6. Visual indicator for WIP breach (color + tooltip); breach events logged.

## Non-Functional
- Changes persisted; board loads < 200ms for 500 tasks.

## Notes
- Kanban = visualize work; pull system; enforce WIP to curb multitasking.
