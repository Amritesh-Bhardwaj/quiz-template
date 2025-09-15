// app/api/quiz/terminate/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { violationCount } = await req.json();

  // A redundant check to ensure a submission doesn't already exist.
  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSubmission) {
    return NextResponse.json({ message: "Submission already recorded." }, { status: 200 });
  }

  // Record a terminated session with a score of 0.
  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: user.id,
    score: 0,
    answers: [], // No answers are saved for a terminated quiz
    was_terminated: true,
    violation_count: violationCount,
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to record termination." }, { status: 500 });
  }

  // Clean up the user's active quiz session.
  await supabase.from("quiz_sessions").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true }, { status: 200 });
}
