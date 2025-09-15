import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    redirect("/404"); 
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Welcome, admin. You can repeat the quiz for testing purposes.</p>
      <Link href="/quiz">
        <Button className="mt-4">Go to Quiz (Practice Mode)</Button>
      </Link>
    </div>
  );
}
