import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, logAdminAction } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DisplayConfigRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/display-config — 전체 role×column 설정 */
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("display_config")
    .select("*")
    .order("role")
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: (data ?? []) as DisplayConfigRow[] });
}

/**
 * PATCH /api/admin/display-config — 열 표시 설정 저장 (PRD 14-5)
 * body: { updates: [{ role, column_key, is_visible, label, display_order }] } UPSERT
 */
export async function PATCH(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: {
    updates?: {
      role: string;
      column_key: string;
      is_visible?: boolean;
      label?: string;
      display_order?: number;
    }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const updates = body.updates ?? [];
  if (updates.length === 0) return NextResponse.json({ error: "no updates" }, { status: 400 });

  const rows = updates.map((u) => ({
    role: u.role as DisplayConfigRow["role"],
    column_key: u.column_key,
    is_visible: u.is_visible ?? true,
    label: u.label ?? null,
    display_order: u.display_order ?? 0,
    updated_by: ctx.userId,
    updated_at: new Date().toISOString(),
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("display_config").upsert(rows, { onConflict: "role,column_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(ctx.userId, `화면 열 표시 설정 변경 (${rows.length}건)`);
  return NextResponse.json({ success: true });
}
