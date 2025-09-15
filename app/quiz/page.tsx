// app/quiz/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import QuizGatePage from "./quiz-gate";

export default async function QuizPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    const { data: submission } = await supabase
      .from("submissions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (submission) redirect("/quiz/submitted");
  }

  return <QuizGatePage isAdmin={isAdmin} />;
}
