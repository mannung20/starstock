import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/site-config — 사이트 설정 저장 (PRD 14-8-5)
 * body: { entries: { [key]: string } }  →  site_config UPSERT (onConflict key)
 */
export async function PATCH(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { entries?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const entries = body.entries ?? {};
  const keys = Object.keys(entries);
  if (keys.length === 0) return NextResponse.json({ error: "no entries" }, { status: 400 });

  const rows = keys.map((key) => ({
    key,
    value: String(entries[key] ?? ""),
    updated_by: ctx.userId,
    updated_at: new Date().toISOString(),
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("site_config").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `사이트설정 변경: ${keys.join(", ").slice(0, 200)}`);
  return NextResponse.json({ success: true });
}
