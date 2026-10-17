import Link from "next/link";
import { readDb } from "@/lib/db";

export default function ShopsPage() {
  const db = readDb();
  const shops = db.shops.filter((s) => s.status === "active");
  const countByShop = new Map<string, number>();
  for (const p of db.products) {
    countByShop.set(p.shopId, (countByShop.get(p.shopId) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-stone-900">Partner shops</h1>
          <p className="text-sm text-stone-600">
            Each shop keeps its own catalogue and pricing - ZAWIYA puts them
            all in one cart and one checkout.
          </p>
        </div>
        <Link
          href="/shops/register"
          className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:border-stone-500"
        >
          List your shop
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shops.map((s) => (
          <Link
            key={s.id}
            href={`/shops/${s.id}`}
            className="rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: s.accent }} />
              <div>
                <div className="font-semibold text-stone-900">{s.name}</div>
                <div className="text-xs text-stone-500">{s.city}, Jordan</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-stone-600">{s.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.styleTags.map((t) => (
                <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-stone-500">
              {countByShop.get(s.id) ?? 0} items on ZAWIYA
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
