import { SUB_ORDER_STATUS_LABELS, type SubOrderStatus } from "@/lib/types";

const COLORS: Record<SubOrderStatus, string> = {
  placed: "bg-stone-100 text-stone-700",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-amber-50 text-amber-700",
  out_for_delivery: "bg-purple-50 text-purple-700",
  delivered: "bg-sage-50 text-sage-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function SubOrderStatusBadge({ status }: { status: SubOrderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status]}`}>
      {SUB_ORDER_STATUS_LABELS[status]}
    </span>
  );
}
