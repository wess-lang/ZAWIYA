import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const db = readDb();
  const addresses = db.addresses.filter((a) => a.userId === user.id);

  return <CheckoutForm addresses={addresses} />;
}
