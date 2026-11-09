import { SUB_ORDER_STATUS_LABELS, type SubOrderStatus } from "@/lib/types";
import Badge from "@/components/ui/Badge";

const TONES: Record<SubOrderStatus, "neutral" | "info" | "warning" | "plum" | "success" | "danger"> = {
  placed: "neutral",
  confirmed: "info",
  preparing: "warning",
  out_for_delivery: "plum",
  delivered: "success",
  cancelled: "danger",
};

export default function SubOrderStatusBadge({ status }: { status: SubOrderStatus }) {
  return <Badge tone={TONES[status]}>{SUB_ORDER_STATUS_LABELS[status]}</Badge>;
}
