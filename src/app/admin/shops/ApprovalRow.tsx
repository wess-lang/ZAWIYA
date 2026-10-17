"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shop } from "@/lib/types";

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
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: shop.accent }} />
            <span className="font-semibold text-stone-900">{shop.name}</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {ownerName} · {shop.city}
          </p>
          <p className="mt-1 text-sm text-stone-600">{shop.tagline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shop.styleTags.map((t) => (
              <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => act("approve")}
            disabled={loading}
            className="rounded-full bg-sage-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-700 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            onClick={() => setShowReject((v) => !v)}
            disabled={loading}
            className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-medium hover:border-stone-500"
          >
            Reject
          </button>
        </div>
      </div>
      {showReject && (
        <div className="mt-3 flex gap-2">
          <input
            placeholder="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
          />
          <button
            onClick={() => act("reject")}
            disabled={loading || !reason}
            className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm reject
          </button>
        </div>
      )}
    </div>
  );
}
