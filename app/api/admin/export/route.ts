import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, username, roll_no, phone")
  const { data: submissions } = await supabase.from("submissions").select("user_id, score, submitted_at")
  const subMap = new Map(submissions?.map((s) => [s.user_id, s]) ?? [])

  const header = ["full_name", "email", "username", "roll_no", "phone", "has_attempted", "score", "submitted_at"]
  const rows = (profiles ?? []).map((p) => [
    p.full_name,
    p.email,
    p.username,
    p.roll_no,
    p.phone,
    subMap.has(p.id) ? "true" : "false",
    subMap.get(p.id)?.score ?? "",
    subMap.get(p.id)?.submitted_at ?? "",
  ])
  const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join(
    "\n",
  )

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quiz_users.csv"`,
    },
  })
}
