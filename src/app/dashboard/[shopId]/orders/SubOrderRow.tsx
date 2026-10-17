"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUB_ORDER_STATUS_FLOW, SUB_ORDER_STATUS_LABELS, type SubOrder } from "@/lib/types";
import SubOrderStatusBadge from "@/components/SubOrderStatusBadge";

export default function SubOrderRow({
  orderId,
  subOrder,
}: {
  orderId: string;
  subOrder: SubOrder;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderId}/suborders/${subOrder.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const options: string[] = [...SUB_ORDER_STATUS_FLOW, "cancelled"];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
      <SubOrderStatusBadge status={subOrder.status} />
      <div className="flex items-center gap-2">
        <select
          value={subOrder.status}
          disabled={loading}
          onChange={(e) => updateStatus(e.target.value)}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {SUB_ORDER_STATUS_LABELS[s as keyof typeof SUB_ORDER_STATUS_LABELS]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
