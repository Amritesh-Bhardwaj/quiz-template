import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 })

  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!me || me.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })

  // Delete from auth and cascade to profiles via FK
  const svc = createServiceClient()
  const { error } = await (svc as any).auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ message: "Failed to delete" }, { status: 500 })

  return NextResponse.redirect(new URL("/admin", request.url))
}
