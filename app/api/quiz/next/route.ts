import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
// Using the service role key to bypass RLS and fetch question data directly.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("question_ids, current_index, current_started_at, per_question_secs, ends_at, is_practice")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 });

  const idx = session.current_index;
  if (idx >= session.question_ids.length) {
    return NextResponse.json({ finished: true });
  }

  const qid = session.question_ids[idx];
  const { data: q, error } = await supabaseAdmin.from("questions").select("id, prompt, options").eq("id", qid).single();
  if (error) return NextResponse.json({ error: "Question not found" }, { status: 500 });

  const perQuestionEndsAt = new Date(new Date(session.current_started_at).getTime() + session.per_question_secs * 1000).toISOString();

  return NextResponse.json({
    index: idx,
    total: session.question_ids.length,
    question: q,
    perQuestionEndsAt,
    is_practice: session.is_practice
  });
}
