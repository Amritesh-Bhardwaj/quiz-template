// app/api/profile/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    full_name: string; username: string; roll_no: string; phone: string;
  } | null;
  if (!body?.full_name || !body?.username || !body?.roll_no || !body?.phone) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: body.full_name,
    username: body.username,
    roll_no: body.roll_no,
    phone: body.phone,
  }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
