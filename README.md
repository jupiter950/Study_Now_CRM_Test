# GSP Workflow Prototype

Take-home prototype for StudyNow's CRM & Automation Developer technical assessment.

## Prerequisites

- Node.js 18+ (tested on Node 20/22)
- MongoDB running locally (or update `MONGODB_URI` to Atlas)

## Install & Run

```bash
npm install
npm run dev
```

Create `.env` from `.env.example`:

- macOS/Linux:
  ```bash
  cp .env.example .env
  ```
- Windows PowerShell:
  ```powershell
  Copy-Item .env.example .env
  ```

Open [http://localhost:3000](http://localhost:3000) for the demo UI.

## Environment Variables

Configured in `.env`:

- `PORT` - API/UI port (default: `3000`)
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - optional; if not set, the app uses mock AI provider

## Architecture

- **Node + Express + MongoDB** backend
- **State machine** for stage transitions (`src/workflow/stages.js`, `transitions.js`, `stateMachine.js`)
- **Rule engine** for conditional gates (`src/workflow/rules.js`)
  - Required documents gate (`qa_review -> app_review`)
  - Admission officer note gate (`app_review -> decision`)
- **Role boundary** middleware (`src/middleware/require-role.js`)
  - Agent can only access own applications
  - Agent cannot perform internal transitions/actions
- **Contextual actions** system (`src/workflow/actions.js`, `src/services/action.service.js`)
- **AI readiness** integration (`src/services/ai-assessment.service.js`)
  - Auto-triggered when entering `qa_review` / `app_review`
  - Stores results in `AiAssessment`
  - Advisory only; transition logic does not auto-approve/reject

## Demo UI

Plain HTML/JS UI (`public/`) supports:

- Role switcher + Agent ID input
- Create application
- List and select applications
- Run transitions (disabled when blocked)
- Run contextual actions (disabled when blocked)
- Upload document / add note
- Trigger and view AI readiness assessment
- View clear API error payloads

## API Examples (curl)

### Create application as agent

```bash
curl -X POST http://localhost:3000/applications \
  -H "Content-Type: application/json" \
  -H "X-Role: agent" \
  -H "X-Agent-Id: agent-001" \
  -d "{\"studentName\":\"Jane Doe\",\"course\":\"MSc CS\",\"university\":\"Example Uni\"}"
```

### List applications

```bash
curl http://localhost:3000/applications -H "X-Role: counsellor"
```

### Available transitions

```bash
curl http://localhost:3000/applications/<APP_ID>/available-transitions -H "X-Role: qa_officer"
```

### Transition stage

```bash
curl -X POST http://localhost:3000/applications/<APP_ID>/transitions \
  -H "Content-Type: application/json" \
  -H "X-Role: qa_officer" \
  -d "{\"to\":\"app_review\"}"
```

### Available actions

```bash
curl http://localhost:3000/applications/<APP_ID>/available-actions -H "X-Role: admission_officer"
```

### Trigger AI assessment

```bash
curl -X POST http://localhost:3000/applications/<APP_ID>/ai-assessment \
  -H "Content-Type: application/json" \
  -H "X-Role: qa_officer" \
  -d "{}"
```

## AI Tools Disclosure

Used Cursor AI assistance to:

- scaffold/iterate route and service structure
- implement repetitive boilerplate safely
- verify requirement-to-code coverage during development

All final logic, structure, and behavior were reviewed and adjusted in-context.

## Scope Cuts & Assumptions

- Focused on required 6-7 stage subset (not full 11-stage production pipeline)
- No production authentication/JWT (role via headers for assessment demo)
- `Offer Exists` alternate entry flow omitted
- `Add Task` contextual action omitted (not mandatory in the brief)
- Demo UI is intentionally minimal and backend-focused

## Known Limitations

- No automated test suite yet (manual API/UI checks performed)
- No pagination/filtering/search on list endpoints
- No file binary upload; document upload is metadata-based
- Mock AI provider is default unless `OPENAI_API_KEY` is provided
- No production-grade auth, rate limiting, or audit dashboard

## Interview Demo Flow (Suggested)

1. Create application as `agent` (`agent-001`)
2. Switch to `counsellor` and move `new_app -> qa_review`
3. Show blocked transition if required docs are missing
4. Upload docs / add notes and retry transitions
5. Switch roles to show permission boundaries (agent transition -> 403)
6. Show available actions with blocked reasons by stage
7. Trigger/view AI assessment at `qa_review` or `app_review`
8. Attempt invalid transitions/actions to demonstrate validation errors
