import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const defaultOptions = ["Option A", "Option B", "Option C", "Option D"]
  const { error } = await supabase.from("questions").insert({
    prompt: "New question text here...",
    options: defaultOptions,
    correct_index: 0,
    created_by: user.id,
  })
  if (error) return NextResponse.json({ error: "Create failed" }, { status: 500 })
  return new NextResponse(null, { status: 201 })
}
