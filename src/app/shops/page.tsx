import Link from "next/link";
import { readDb } from "@/lib/db";
import { Card, Container } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ShopLogo from "@/components/ShopLogo";

export default function ShopsPage() {
  const db = readDb();
  const shops = db.shops.filter((s) => s.status === "active");
  const countByShop = new Map<string, number>();
  for (const p of db.products) {
    countByShop.set(p.shopId, (countByShop.get(p.shopId) ?? 0) + 1);
  }

  return (
    <Container size="xl" className="py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Partner shops
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Each shop keeps its own catalogue and pricing — ZAWIYA puts them
            all in one cart and one checkout.
          </p>
        </div>
        <Button href="/shops/register" variant="outline" className="shrink-0">
          List your shop
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((s) => (
          <Link key={s.id} href={`/shops/${s.id}`}>
            <Card hover className="h-full">
              <div className="flex items-center gap-3">
                <ShopLogo name={s.name} accent={s.accent} size={48} />
                <div>
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.city}, Jordan</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.styleTags.map((t) => (
                  <Badge key={t} tone="neutral">{t}</Badge>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {countByShop.get(s.id) ?? 0} items on ZAWIYA
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
}
