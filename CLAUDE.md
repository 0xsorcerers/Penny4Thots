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

<git_rules>
  CRITICAL: Do NOT commit, push, amend, or force-push unless the user explicitly asks you to.

  Default workflow:
  1. Make code changes and leave them as local uncommitted work.
  2. After finishing a task, briefly summarize what changed so the user can test.
  3. The user tests the app and decides whether to commit, push, or discard.

  Only when the user clearly asks to commit and/or push (e.g. "commit", "push", "save our work"):
  - Follow their exact request for that moment only.
  - Never treat that as ongoing permission for future work.

  Never:
  - Auto-commit after features
  - Push "to keep remotes in sync" without being asked
  - Commit or push at conversation start or after every task
  - Sync or push to both remotes unless the user explicitly requests it
</git_rules>

<progress_tracking>
  Maintain a PROGRESS.md file in the root directory:
  - Update after each significant change or feature completion
  - Include date, feature name, and brief description
  - This serves as a human-readable changelog
</progress_tracking>
