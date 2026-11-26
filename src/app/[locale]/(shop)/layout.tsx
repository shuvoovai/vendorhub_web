import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingCart } from "@/components/cart/floating-cart";
import { SiteFooter } from "@/components/layout/site-footer";
import { TopNav } from "@/components/layout/top-nav";
import { VerifyBanner } from "@/components/auth/email-verification";
import { DeletionGate } from "@/components/account/deletion-gate";
// Shared frame for all shopping pages: top bar, content, bottom bar on phones.
export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />
      <VerifyBanner />
      <DeletionGate />
      {/* The footer below leaves room for the phone bottom bar */}
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-10 md:px-10">
        {children}
      </main>
      <SiteFooter locale={locale} />
      {/* Reads the address, so it waits inside Suspense */}
      <Suspense>
        <FloatingCart />
      </Suspense>
      <BottomNav />
    </div>
  );
}