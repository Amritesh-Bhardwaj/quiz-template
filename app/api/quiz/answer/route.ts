import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

// Calculates the final score, records the submission, and cleans up the quiz session.
async function finalizeQuiz(supabase: any, user: any, session: any, finalAnswers: any[]) {
  const { data: submission } = await supabase.from("submissions").select("id").eq("user_id", user.id).maybeSingle();
  if (submission) return; // Already submitted

  const { data: questions } = await supabase.from("questions").select("id, correct_index").in("id", session.question_ids);
  if (!questions) throw new Error("Failed to fetch questions for scoring");

  const correctMap = new Map(questions.map((q: { id: string; correct_index: number }) => [q.id, q.correct_index]));
  let score = 0;
  for (const ans of finalAnswers) {
    if (ans.status === 'answered') {
      if (ans.choice_index === correctMap.get(ans.question_id)) {
        score += 2;
      } else {
        score -= 0.25;
      }
    }
  }

  await supabase.from("submissions").insert({ user_id: user.id, score, answers: finalAnswers });
  await supabase.from("quiz_sessions").delete().eq("id", session.id); // Clean up the session
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: session } = await supabase.from("quiz_sessions").select("*").eq("user_id", user.id).single();

  if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 });
  if (body.question_id !== session.question_ids[session.current_index]) {
    return NextResponse.json({ error: "Question sequence mismatch" }, { status: 409 });
  }

  const answers = [...(session.answers || []), {
    question_id: body.question_id,
    choice_index: body.choice_index,
    status: body.action,
  }];

  const nextIndex = session.current_index + 1;
  const isFinished = nextIndex >= session.question_ids.length;

  if (isFinished) {
    if (!session.is_practice) {
      await finalizeQuiz(supabase, user, session, answers);
    } else {
      await supabase.from("quiz_sessions").delete().eq("id", session.id);
    }
    return NextResponse.json({ finished: true });
  }

  const currentStartedAt = new Date().toISOString();
  await supabase.from("quiz_sessions").update({
    answers,
    current_index: nextIndex,
    current_started_at: currentStartedAt,
  }).eq("id", session.id);

  const nextQId = session.question_ids[nextIndex];
  const { data: q, error } = await supabaseAdmin.from("questions").select("id, prompt, options").eq("id", nextQId).single();
  if (error) return NextResponse.json({ error: "Question not found" }, { status: 500 });

  const perQuestionEndsAt = new Date(new Date(currentStartedAt).getTime() + session.per_question_secs * 1000).toISOString();

  return NextResponse.json({
    finished: false,
    index: nextIndex,
    total: session.question_ids.length,
    question: q,
    perQuestionEndsAt,
    is_practice: session.is_practice
  });
}
