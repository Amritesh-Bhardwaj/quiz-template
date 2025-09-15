import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const svc = createServiceClient()
  const { error } = await (svc as any).auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
