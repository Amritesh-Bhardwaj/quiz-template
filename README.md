# quiz-template

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=nextdotjs) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?style=for-the-badge&logo=supabase) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=for-the-badge&logo=typescript) 

A secure, step-by-step quiz portal skeleton built with Next.js App Router and Supabase, designed for timed quizzes with strict question sequencing, admin practice mode, and RLS-backed data protection. \

## Highlights 
- Strict question sequencing and atomic answer-advance flow via server routes, preventing skipping or replay attacks in the client. 
- Per-question timers and fullscreen gating overlay in the client UI for better proctoring UX. 
- Admin practice mode generates sessions without locking in a submission, making it safe to test the flow. 
- One-submission enforcement and termination endpoint for auto-submission on rule violations. 
- Server-only access to correct answers and service role operations; the client never sees answers or service keys. 

## Tech stack 
- Next.js App Router with server components and route handlers for the quiz APIs. 
- Supabase Auth, Postgres, and Row Level Security (RLS) for zero-trust client access. 
- TypeScript-first codebase with modular UI components.

## Architecture [web:158]
- Routes: POST /api/quiz/start to create/reset a session, GET /api/quiz/next to fetch the next question, POST /api/quiz/answer to record the answer and advance, POST /api/quiz/submit to finalize, POST /api/quiz/terminate for rule breaches.
- Session model: quiz_sessions tracks user_id, ordered question_ids, current_index, per-question timing, and answers; submissions is written once at completion or termination. 
- Admin-only reads for questions content via a server-side Supabase “service role” client; never exposed to the browser. 

## Security model 
- Enable RLS on application tables and write explicit policies that scope data access by auth.uid(), ensuring the browser cannot read beyond its own session/records. 
- Only use the SUPABASE_SERVICE_ROLE_KEY in server route handlers for privileged operations like reading question prompts/options or selecting random questions.
- Keep the service role key out of client bundles and environment exposed to the browser; use publishable anon keys for client-side Supabase usage only.

## Repository template usage 
- This repository is configured as a template, so new projects can be created via the “Use this template” button on GitHub. 
- Template-based repos start as independent repositories with a single clean commit, avoiding any prior commit history.

## Getting started [web:164]
1) Clone a repository created from this template.
2) Create a Supabase project and retrieve the Project URL, anon key, and a service role key.
3) Copy .env.example to .env.local and set:  
   - NEXT_PUBLIC_SUPABASE_URL  
   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - SUPABASE_SERVICE_ROLE_KEY (server-only) 
4) Install dependencies and run the dev server:  
   - pnpm install  
   - pnpm dev  
   Then visit http://localhost:3000.

## Database setup [web:164]
- Open the Supabase SQL editor and run the SQL files in scripts/ in order (e.g., 001_init_schema.sql → 002_helpers.sql → others) to create tables, helpers, and policies. 
- Ensure RLS is enabled on the created tables; add or tweak policies as needed for your org.

## Core flows
- Start: POST /api/quiz/start picks a new set of questions and opens a session; admins are automatically in practice mode.
- Next: GET /api/quiz/next returns the current question and a per-question deadline without exposing any answer keys.
- Answer: POST /api/quiz/answer records the user’s choice, enforces sequence, and advances the index; finalization occurs when the last question is answered.
- Submit: POST /api/quiz/submit persists the score and cleans up session state for standard flow.
- Terminate: POST /api/quiz/terminate records violations and zero-score termination, then cleans up the session.

## Anti-cheat notes
- Client prevents tab switching and requires fullscreen, but treat the browser as untrusted and keep all scoring and sequencing on the server.
- RLS and server-side reads ensure question content and correct answers never reach the client except the prompt/options for the current item.

## Customization
- Update the selection strategy (e.g., Postgres function) for picking random question_ids if you need weighted or topic-constrained sampling.
- Extend admin routes for question management and CSV export under app/api/admin as needed.

## Contributing
- Issues and PRs are welcome; please include clear steps to reproduce and proposed changes.

## License
- Apache-2.0 © 2025 — see LICENSE for details.
