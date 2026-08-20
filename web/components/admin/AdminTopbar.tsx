"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MaintenanceToggle } from "./MaintenanceToggle";
import { adminTitleFor } from "./nav-items";

export function AdminTopbar({ email, maintenanceOn }: { email: string | null; maintenanceOn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
      <h1 className="text-lg font-bold">{adminTitleFor(pathname)}</h1>
      <div className="flex items-center gap-3 text-sm">
        <MaintenanceToggle initialOn={maintenanceOn} />
        <span className="hidden text-muted-foreground sm:inline">{email}</span>
        <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
      </div>
    </div>
  );
}
