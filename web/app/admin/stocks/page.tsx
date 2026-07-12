import { createAdminClient } from "@/lib/supabase/admin";
import { StocksManager } from "@/components/admin/StocksManager";
import type { StockRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStocksPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("stocks").select("*").order("rank", { ascending: true });
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
        ⚠️ 엑셀 업로드 시 가격·종목코드는 덮어씌워집니다. 숨김(표시여부)·상태·메모·목표가·손절가는 유지됩니다.
      </div>
      <StocksManager stocks={(data ?? []) as StockRow[]} />
    </div>
  );
}
