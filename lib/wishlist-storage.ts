export type WishlistItem = {
  productId: string;
  productName: string;
  price: number;
  image: string;
  addedAt: string;
};

function storageKey(email: string): string {
  return `test_wishlist_${email.toLowerCase()}`;
}

export function readWishlist(email: string): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

export function addToWishlist(email: string, item: WishlistItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readWishlist(email);
    if (existing.some((i) => i.productId === item.productId)) return;
    localStorage.setItem(storageKey(email), JSON.stringify([...existing, item]));
  } catch {
    // ignore storage errors silently
  }
}

export function removeFromWishlist(email: string, productId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readWishlist(email);
    localStorage.setItem(
      storageKey(email),
      JSON.stringify(existing.filter((i) => i.productId !== productId))
    );
  } catch {
    // ignore storage errors silently
  }
}
