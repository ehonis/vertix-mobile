# Session Model Notes (Draft)

Status: discussion draft only (no schema/code changes yet)

## Decisions Captured

1. A user can have only one active session at a time.
2. Auto-created sessions (when a route is logged without an active session) default to `FUN`.
3. Sessions are editable at any time (type/name/time metadata can be adjusted later).
4. Session-level time slot is the source of truth for completion timing UX:
   - User picks one time slot per session.
   - Completions in that session inherit that time context.
   - Avoid asking the user to pick completion time for each send.
5. Route completions should include competition metadata (`isCompetition`, `competitionId`) so comp and non-comp sends are cohesive.
6. Competition completion writes should be dual-write for now:
   - Continue writing to existing comp models.
   - Also write comp metadata into regular route completion/session flow.

## Proposed Data Model (High Level)

### New table: `ClimbingSession`

- `id` (string/cuid, PK)
- `userId` (FK -> user)
- `type` (enum; examples below)
- `name` (optional; auto-fill with `{type} + date` if blank)
- `status` (`ACTIVE`, `COMPLETED`, `CANCELLED`)
- `startedAt`
- `endedAt` (nullable)
- `sessionDate` (date user is attributing the session to; supports retro logging)
- `timeSlot` (nullable; chosen once and inherited by completions)
- `isRetroactive` (bool)
- `isAtGym` (bool/nullable)
- `isCompetition` (bool default false)
- `competitionId` (nullable)
- `competitionType` (nullable, if needed to disambiguate comp families)
- `createdAt`
- `updatedAt`

### Existing table: `RouteCompletion` additions

- `sessionId` (nullable FK -> `ClimbingSession`; auto-created if absent)
- `isCompetition` (bool default false)
- `competitionId` (nullable)
- `competitionType` (nullable)

## Session Type Enum (initial)

- `FUN`
- `CUSTOM`
- `POWER`
- `POWER_ENDURANCE`
- `TENSION_BOARD`
- `COMPETITION`
- `ENDURANCE`
- `WORKOUT`

Note: `CUSTOM` can optionally support a user-defined display label.

## Product Rules (Draft)

- Max active session count: `1` per user at a time.
- Max sessions per day: allow `2-3` separate sessions (final exact cap TBD).
- Session can be started explicitly from button menu or implicitly by first completion.
- Comp mode should be represented within the same completion/session flow (not separate UX silo).

## Open Question(s)

1. Competition ID uniqueness:
   - If competition IDs are globally unique, `competitionId` alone is enough.
   - If not guaranteed unique across competition systems, use `(competitionType, competitionId)` as a pair everywhere.
2. Final daily cap:
   - Set to exactly `2` or exactly `3` sessions/day?

## Suggested Next Step (when ready)

When you are ready to proceed, implement in this order:
1. Schema additions (no migration execution in this draft stage).
2. API writes for session creation + auto-create on completion.
3. Dual-write comp metadata into `RouteCompletion`.
4. Read-path updates to drive the new UI session grouping.

