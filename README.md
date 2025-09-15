# quiz-template [web:158]

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=nextdotjs) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?style=for-the-badge&logo=supabase) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=for-the-badge&logo=typescript) [web:172][web:169]

A secure, step-by-step quiz portal skeleton built with Next.js App Router and Supabase, designed for timed quizzes with strict question sequencing, admin practice mode, and RLS-backed data protection. [attached_file:3][attached_file:6][web:10]

## Highlights [web:158]
- Strict question sequencing and atomic answer-advance flow via server routes, preventing skipping or replay attacks in the client. [attached_file:4][attached_file:5]
- Per-question timers and fullscreen gating overlay in the client UI for better proctoring UX. [attached_file:2]
- Admin practice mode generates sessions without locking in a submission, making it safe to test the flow. [attached_file:6]
- One-submission enforcement and termination endpoint for auto-submission on rule violations. [attached_file:7][attached_file:8]
- Server-only access to correct answers and service role operations; the client never sees answers or service keys. [attached_file:5][attached_file:6]

## Tech stack [web:158]
- Next.js App Router with server components and route handlers for the quiz APIs. [attached_file:3][attached_file:5]
- Supabase Auth, Postgres, and Row Level Security (RLS) for zero-trust client access. [web:10][web:164]
- TypeScript-first codebase with modular UI components. [attached_file:2]

## Architecture [web:158]
- Routes: POST /api/quiz/start to create/reset a session, GET /api/quiz/next to fetch the next question, POST /api/quiz/answer to record the answer and advance, POST /api/quiz/submit to finalize, POST /api/quiz/terminate for rule breaches. [attached_file:6][attached_file:5][attached_file:4][attached_file:7][attached_file:8]
- Session model: quiz_sessions tracks user_id, ordered question_ids, current_index, per-question timing, and answers; submissions is written once at completion or termination. [attached_file:6][attached_file:4][attached_file:7]
- Admin-only reads for questions content via a server-side Supabase “service role” client; never exposed to the browser. [attached_file:5]

## Security model [web:10]
- Enable RLS on application tables and write explicit policies that scope data access by auth.uid(), ensuring the browser cannot read beyond its own session/records. [web:10]
- Only use the SUPABASE_SERVICE_ROLE_KEY in server route handlers for privileged operations like reading question prompts/options or selecting random questions. [attached_file:5][attached_file:6]
- Keep the service role key out of client bundles and environment exposed to the browser; use publishable anon keys for client-side Supabase usage only. [web:164]

## Repository template usage [web:62]
- This repository is configured as a template, so new projects can be created via the “Use this template” button on GitHub. [web:62]
- Template-based repos start as independent repositories with a single clean commit, avoiding any prior commit history. [web:50]

## Getting started [web:164]
1) Clone a repository created from this template. [web:62]  
2) Create a Supabase project and retrieve the Project URL, anon key, and a service role key. [web:164]  
3) Copy .env.example to .env.local and set:  
   - NEXT_PUBLIC_SUPABASE_URL  
   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - SUPABASE_SERVICE_ROLE_KEY (server-only) [attached_file:5][attached_file:6]  
4) Install dependencies and run the dev server:  
   - pnpm install  
   - pnpm dev  
   Then visit http://localhost:3000. [web:164]

## Database setup [web:164]
- Open the Supabase SQL editor and run the SQL files in scripts/ in order (e.g., 001_init_schema.sql → 002_helpers.sql → others) to create tables, helpers, and policies. [attached_file:7]
- Ensure RLS is enabled on the created tables; add or tweak policies as needed for your org. [web:10]

## Core flows [web:158]
- Start: POST /api/quiz/start picks a new set of questions and opens a session; admins are automatically in practice mode. [attached_file:6]
- Next: GET /api/quiz/next returns the current question and a per-question deadline without exposing any answer keys. [attached_file:5]
- Answer: POST /api/quiz/answer records the user’s choice, enforces sequence, and advances the index; finalization occurs when the last question is answered. [attached_file:4]
- Submit: POST /api/quiz/submit persists the score and cleans up session state for standard flow. [attached_file:7]
- Terminate: POST /api/quiz/terminate records violations and zero-score termination, then cleans up the session. [attached_file:8]

## Anti-cheat notes [web:10]
- Client prevents tab switching and requires fullscreen, but treat the browser as untrusted and keep all scoring and sequencing on the server. [attached_file:2]
- RLS and server-side reads ensure question content and correct answers never reach the client except the prompt/options for the current item. [attached_file:5][web:10]

## Customization [web:158]
- Update the selection strategy (e.g., Postgres function) for picking random question_ids if you need weighted or topic-constrained sampling. [attached_file:6]
- Extend admin routes for question management and CSV export under app/api/admin as needed. [attached_file:7]

## Contributing [web:165]
- Issues and PRs are welcome; please include clear steps to reproduce and proposed changes. [web:165]

## License [web:160]
- Add a LICENSE file (e.g., MIT or Apache-2.0) to clarify usage and contributions for downstream users. [web:160]
