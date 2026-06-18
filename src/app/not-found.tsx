import Link from "next/link";
import { Home, ShoppingBag, Search, Sparkles } from "lucide-react";

const categories: { name: string; icon: typeof Sparkles }[] = [];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-beige to-white px-4 py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 animate-pulse rounded-full bg-brand-primary/20 blur-3xl" />
          <div
            className="absolute -bottom-32 -right-32 h-[400px] w-[400px] animate-pulse rounded-full bg-brand-beige/30 blur-3xl"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="container relative mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-brand-primary md:text-4xl">
            Looks like this page has drifted away...
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-base text-brand-primary md:text-lg">
            The page you were looking for may have moved, but your perfect scent
            is still waiting. Let us help you find what you need.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/en"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-brand-gold bg-brand-gold px-8 text-base font-medium uppercase tracking-wide text-white transition-all duration-300 hover:bg-transparent hover:text-brand-gold"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/en/shop"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-brand-gold bg-transparent px-8 text-base font-medium uppercase tracking-wide text-brand-gold transition-all duration-300 hover:bg-brand-gold hover:text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Explore Our Shop
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-primary" />
            <h2 className="text-lg font-semibold uppercase tracking-widest text-brand-gold md:text-xl">
              Popular Categories
            </h2>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href="/en/shop"
                className="group flex items-center gap-3 rounded-xl border border-brand-primary/15 bg-brand-beige/50 p-4 transition-all duration-300 hover:border-brand-primary hover:bg-brand-beige hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-beige transition-colors group-hover:bg-brand-primary">
                  <cat.icon className="h-5 w-5 text-brand-primary" />
                </div>
                <span className="text-sm font-medium text-brand-primary md:text-base">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-brand-beige px-4 py-12">
        <div className="container mx-auto max-w-2xl text-center">
          <Search className="mx-auto mb-4 h-8 w-8 text-brand-gold" />
          <h3 className="mb-2 text-lg font-semibold text-brand-primary">
            Need Help?
          </h3>
          <p className="mb-6 text-brand-primary">
            Our team is here to help you find exactly what you&apos;re looking
            for.
          </p>
          <Link
            href="/en/contact"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border-2 border-brand-gold bg-transparent px-4 text-xs font-medium uppercase tracking-wide text-brand-gold transition-all duration-300 hover:bg-brand-gold hover:text-white"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
