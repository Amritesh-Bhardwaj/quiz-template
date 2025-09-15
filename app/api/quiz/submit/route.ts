// app/api/quiz/submit/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSubmission) {
    return NextResponse.json({ message: "Submission already recorded." }, { status: 200 });
  }

  const { data: answers, error: answersError } = await supabase
    .from("quiz_answers")
    .select("question_id, choice_index")
    .eq("user_id", user.id);

  if (answersError) {
    return NextResponse.json({ error: "Failed to fetch answers." }, { status: 500 });
  }

  const questionIds = answers.map(a => a.question_id);
  const { data: correctAnswers, error: correctAnswersError } = await supabase
    .from("questions")
    .select("id, correct_option")
    .in("id", questionIds);

  if (correctAnswersError) {
    return NextResponse.json({ error: "Failed to fetch correct answers." }, { status: 500 });
  }

  let score = 0;
  const correctAnswersMap = new Map(correctAnswers.map(ca => [ca.id, ca.correct_option]));
  for (const answer of answers) {
    if (correctAnswersMap.get(answer.question_id) === answer.choice_index) {
      score++;
    }
  }

  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: user.id,
    score: score,
    answers: answers,
    was_terminated: false,
    // Violation count is not tracked in this flow, as it's for normal submissions.
    violation_count: 0, 
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to record submission." }, { status: 500 });
  }

  await supabase.from("quiz_sessions").delete().eq("user_id", user.id);
  await supabase.from("quiz_answers").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true, score }, { status: 200 });
}
