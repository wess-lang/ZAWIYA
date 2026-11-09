import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Zawiya<span className="text-accent">.</span>
          </Link>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
            A graduation-project prototype: an AI-powered multi-vendor
            furniture marketplace for Jordan. Partner shops and products
            shown here are placeholder data, not a real retail integration.
          </p>
        </div>

        <div className="flex gap-10 text-xs">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Browse</span>
            <Link href="/shop" className="text-muted-foreground hover:text-foreground">Shop</Link>
            <Link href="/shops" className="text-muted-foreground hover:text-foreground">Partner shops</Link>
            <Link href="/room-fit" className="text-muted-foreground hover:text-foreground">AI Room-Fit</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">Account</span>
            <Link href="/orders" className="text-muted-foreground hover:text-foreground">Orders</Link>
            <Link href="/wishlist" className="text-muted-foreground hover:text-foreground">Wishlist</Link>
            <Link href="/shops/register" className="text-muted-foreground hover:text-foreground">Sell on ZAWIYA</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} ZAWIYA — design-your-space prototype.
      </div>
    </footer>
  );
}
