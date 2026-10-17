import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import AddressForm from "./AddressForm";

// FR-02: Profile & Address Management
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const db = readDb();
  const addresses = db.addresses.filter((a) => a.userId === user.id);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-stone-900">Your profile</h1>
      <p className="mb-6 text-sm text-stone-600">
        {user.name} · {user.email} · <span className="capitalize">{user.role.replace("_", " ")}</span>
      </p>

      <h2 className="mb-3 text-lg font-semibold text-stone-900">Delivery addresses</h2>
      <div className="mb-6 flex flex-col gap-2">
        {addresses.length === 0 && (
          <p className="text-sm text-stone-500">No addresses saved yet.</p>
        )}
        {addresses.map((a) => (
          <div key={a.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
            <span className="font-medium text-stone-900">{a.label}</span>
            <br />
            <span className="text-stone-600">
              {a.details}, {a.city}
            </span>
          </div>
        ))}
      </div>

      <AddressForm />
    </div>
  );
}
