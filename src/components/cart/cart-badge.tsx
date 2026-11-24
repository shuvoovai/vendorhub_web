"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/app-providers";
import { cartKeys, getCart, mergeGuestCart } from "@/lib/api/cart";
import { cn } from "@/lib/utils";

/**
 * True when the cart can be loaded: always for guests; for a logged-in user once the guest cart
 * (if any) has been merged into theirs. Shared by the badge, the cart page and checkout.
 */
export function useCartReady(): boolean {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const merge = useQuery({
    queryKey: ["cart-merge"],
    enabled: status === "authenticated",
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const cart = await mergeGuestCart().catch(() => null);
      if (cart) queryClient.setQueryData(cartKeys.cart, cart);
      else await queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      return true;
    },
  });

  // Logged out: forget the user's cart (the guest cart loads instead) and merge again on the next login.
  const wasAuthed = useRef(false);
  useEffect(() => {
    if (status === "guest" && wasAuthed.current) {
      queryClient.removeQueries({ queryKey: cartKeys.cart });
      queryClient.removeQueries({ queryKey: ["cart-merge"] });
    }
    wasAuthed.current = status === "authenticated";
  }, [status, queryClient]);

  return status === "guest" || (status === "authenticated" && merge.isSuccess);
}

/** Number of items in the cart (guests have a cart too). */
export function useCartCount(): number {
  const ready = useCartReady();
  const { data } = useQuery({
    queryKey: cartKeys.cart,
    queryFn: getCart,
    enabled: ready,
    select: (cart) => cart.totals.itemCount,
    staleTime: 30_000,
  });
  return data ?? 0;
}

/** Sent on window when something was just added to the cart (after the little photo lands). */
export const CART_LANDED_EVENT = "vh:cart-landed";

/**
 * Small bordeaux circle with the count; hidden when the cart is empty.
 * When an item lands in the cart it bounces once and the number flips up like a counter.
 */
export function CartCountBadge({ count, className }: { count: number; className?: string }) {
  const [bumps, setBumps] = useState(0);

  useEffect(() => {
    const onLanded = () => setBumps((n) => n + 1);
    window.addEventListener(CART_LANDED_EVENT, onLanded);
    return () => window.removeEventListener(CART_LANDED_EVENT, onLanded);
  }, []);

  if (count <= 0) return null;
  return (
    <span
      key={bumps} // a new key restarts the one-shot animations
      aria-hidden
      className={cn(
        "type-caption absolute flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full bg-brand px-1 leading-none text-primary-foreground ring-2 ring-card",
        bumps > 0 && "badge-bounce",
        className,
      )}
    >
      <span className={cn("block", bumps > 0 && "badge-flip")}>{count > 99 ? "99+" : count}</span>
    </span>
  );
}