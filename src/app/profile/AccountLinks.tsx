"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageOpen, Store, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Role } from "@/lib/types";

export default function AccountLinks({ role }: { role: Role }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/orders", label: "Your orders", icon: PackageOpen, show: true },
    { href: "/dashboard", label: "Shop dashboard", icon: Store, show: role === "shop_owner" || role === "admin" },
    { href: "/admin/shops", label: "Admin · shop approvals", icon: ShieldCheck, show: role === "admin" },
  ].filter((l) => l.show);

  return (
    <Card padding="none" className="divide-y divide-border overflow-hidden">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted"
        >
          <Icon size={17} className="text-muted-foreground" />
          <span className="flex-1 font-medium text-foreground">{label}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      ))}
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-destructive-soft"
      >
        <LogOut size={17} className="text-destructive" />
        <span className="flex-1 font-medium text-destructive">Sign out</span>
      </button>
    </Card>
  );
}
