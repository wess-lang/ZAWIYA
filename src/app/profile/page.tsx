import { redirect } from "next/navigation";
import { MapPin, UserCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { Card, Container } from "@/components/ui/Card";
import AddressForm from "./AddressForm";
import AccountLinks from "./AccountLinks";

// FR-02: Profile & Address Management
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const db = readDb();
  const addresses = db.addresses.filter((a) => a.userId === user.id);

  return (
    <Container size="sm" className="py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
          <UserCircle2 size={22} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · <span className="capitalize">{user.role.replace("_", " ")}</span>
          </p>
        </div>
      </div>

      <AccountLinks role={user.role} />

      <h2 className="font-display mb-3 mt-8 flex items-center gap-1.5 text-lg font-semibold text-foreground">
        <MapPin size={16} className="text-muted-foreground" /> Delivery addresses
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {addresses.length === 0 && (
          <p className="text-sm text-muted-foreground">No addresses saved yet.</p>
        )}
        {addresses.map((a) => (
          <Card key={a.id} padding="sm" className="text-sm">
            <span className="font-medium text-foreground">{a.label}</span>
            <br />
            <span className="text-muted-foreground">
              {a.details}, {a.city}
            </span>
          </Card>
        ))}
      </div>

      <AddressForm />
    </Container>
  );
}
