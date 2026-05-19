export type CardType = "visa" | "mastercard" | "other";

export interface SavedCard {
  id: string;
  lastFour: string;
  cardType: CardType;
  nameOnCard: string;
  expiry: string;
  addedAt: string;
}

function storageKey(email: string): string {
  return `test_cards_${email.toLowerCase()}`;
}

export function detectCardType(rawNumber: string): CardType {
  const first = rawNumber.replace(/\D/g, "")[0];
  if (first === "4") return "visa";
  if (first === "5") return "mastercard";
  return "other";
}

export function readCards(email: string): SavedCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as SavedCard[]) : [];
  } catch {
    return [];
  }
}

export function addCard(email: string, card: SavedCard): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readCards(email);
    localStorage.setItem(storageKey(email), JSON.stringify([...existing, card]));
  } catch {
    // ignore storage errors silently
  }
}

export function removeCard(email: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readCards(email);
    localStorage.setItem(
      storageKey(email),
      JSON.stringify(existing.filter((c) => c.id !== id))
    );
  } catch {
    // ignore storage errors silently
  }
}
