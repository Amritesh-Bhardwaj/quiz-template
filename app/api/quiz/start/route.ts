import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const QUESTION_COUNT = 20;
const PER_QUESTION_SECS = 90;

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';
  const is_practice = isAdmin; // Admins are always in practice mode

  // Prevent non-admin users from re-taking the quiz if they have a submission.
  if (!is_practice) {
    const { data: submission } = await supabase.from("submissions").select("id").eq("user_id", user.id).maybeSingle();
    if (submission) return NextResponse.json({ error: "Already submitted" }, { status: 403 });
  }

  const { data: picked, error: pickErr } = await supabaseAdmin.rpc("pick_random_question_ids", { count: QUESTION_COUNT });
  if (pickErr || !picked?.length) return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  
  const question_ids = picked.map((r: { id: string }) => r.id);
  const now = Date.now();
  const endsAt = new Date(now + QUESTION_COUNT * PER_QUESTION_SECS * 1000).toISOString();

  const sessionData = {
    user_id: user.id,
    question_ids,
    current_index: 0,
    current_started_at: new Date(now).toISOString(),
    per_question_secs: PER_QUESTION_SECS,
    ends_at: endsAt,
    answers: [],
    is_practice
  };

  // Upsert the quiz session to either create a new one or reset an existing one.
  const { error: upsertErr } = existingSession
    ? await supabase.from("quiz_sessions").update(sessionData).eq("id", existingSession.id)
    : await supabase.from("quiz_sessions").insert(sessionData);

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
