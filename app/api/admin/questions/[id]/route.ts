import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const formData = await req.formData()
  const prompt = String(formData.get("prompt") || "")
  const optionsLines = String(formData.get("options_lines") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  const correct_index = Number(formData.get("correct_index"))

  if (!prompt || optionsLines.length < 2) {
    return NextResponse.json({ error: "At least two options required" }, { status: 400 })
  }
  if (!Number.isInteger(correct_index) || correct_index < 0 || correct_index >= optionsLines.length) {
    return NextResponse.json({ error: "correct_index out of range" }, { status: 400 })
  }

  const { error } = await supabase
    .from("questions")
    .update({
      prompt,
      options: optionsLines,
      correct_index,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
