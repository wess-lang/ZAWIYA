"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ShopLogo from "@/components/ShopLogo";

export default function ApprovalRow({ shop, ownerName }: { shop: Shop; ownerName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "approve" | "reject") {
    setLoading(true);
    try {
      await fetch(`/api/shops/${shop.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? reason : undefined }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShopLogo name={shop.name} accent={shop.accent} size={28} />
            <span className="font-semibold text-foreground">{shop.name}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {ownerName} · {shop.city}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{shop.tagline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shop.styleTags.map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" disabled={loading} onClick={() => act("approve")}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => setShowReject((v) => !v)}
          >
            Reject
          </Button>
        </div>
      </div>
      {showReject && (
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 py-1.5 text-xs"
          />
          <Button
            size="sm"
            variant="danger"
            disabled={loading || !reason}
            onClick={() => act("reject")}
          >
            Confirm reject
          </Button>
        </div>
      )}
    </Card>
  );
}
