# Vibecode Workspace

This workspace contains a mobile app and backend server.

<projects>
  webapp/    — React app (port 8000, environment variable VITE_BASE_URL)
  backend/   — Hono API server (port 3000, environment variable VITE_BACKEND_URL)
</projects>

<agents>
  Use subagents for project-specific work:
  - backend-developer: Changes to the backend API
  - webapp-developer: Changes to the webapp frontend

  Each agent reads its project's CLAUDE.md for detailed instructions.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Define Zod schemas for request/response in backend/src/types.ts (shared contracts)
  2. Implement backend route using the schemas
  3. Test backend with cURL (use $BACKEND_URL, never localhost)
  4. Implement frontend, importing schemas from backend/src/types.ts to parse responses
  5. Test the integration

  <shared_types>
    All API contracts live in backend/src/types.ts as Zod schemas.
    Both backend and frontend can import from this file — single source of truth.
  </shared_types>
</coordination>

<skills>
  Shared skills in .claude/skills/:
  - database-auth: Set up Prisma + Better Auth for user accounts and data persistence
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade web interfaces using React, Tailwind, and shadcn/ui. Use when building pages, components, or styling any web UI.
</skills>

<environment>
  System manages git and dev servers. DO NOT manage these.
  The user views the app through Vibecode Mobile App with a webview preview or Vibecode Web App with an iframe preview.
  The user cannot see code or terminal. Do everything for them.
  Write one-off scripts to achieve tasks the user asks for.
  Communicate in an easy to understand manner for non-technical users.
  Be concise and don't talk too much.
</environment>

<git_sync_rules>
  CRITICAL: This project has TWO git remotes that MUST stay in sync:
  - origin: Vibecode internal server (git.vibecodeapp.com) - used for app restarts
  - github: User's GitHub repo (github.com/0xsorcerers/Penny4Thots.git) - backup & version control

  MANDATORY ACTIONS:
  1. When user says "save progress", "stable build", "commit", "push", or "save our work":
     - Commit all changes with a descriptive message
     - Push to BOTH remotes: `git push origin main && git push github main`
     - Confirm both pushes succeeded

  2. Before ANY major feature work or at conversation start:
     - Run `git fetch github && git fetch origin` to check sync status
     - If repos are out of sync, merge and push to both before proceeding

  3. After completing significant features:
     - Auto-commit with summary of changes
     - Push to BOTH remotes without being asked

  4. If a push to github fails (auth issues):
     - Notify the user immediately
     - Still push to origin so Vibecode restarts don't lose work
     - Ask user to check GitHub connection in Vibecode settings

  NEVER let the two remotes diverge. Lost work = lost money.
</git_sync_rules>

<progress_tracking>
  Maintain a PROGRESS.md file in the root directory:
  - Update after each significant change or feature completion
  - Include date, feature name, and brief description
  - This serves as a human-readable changelog
</progress_tracking>
