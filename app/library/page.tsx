import { LIBRARY } from "@/lib/mock-data";
import LibraryContent from "@/components/library/LibraryContent";

export const metadata = { title: "Library — TEST" };

export default function LibraryPage() {
  // Most-recent sale price per piece
  const totalValue = LIBRARY.reduce((sum, e) => sum + e.salesHistory[0].price, 0);

  // Year span across all sales across all entries
  const allYears = LIBRARY.flatMap((e) =>
    e.salesHistory.map((s) => parseInt(s.date.slice(0, 4)))
  );
  const years = `${Math.min(...allYears)}–${Math.max(...allYears)}`;

  // Total number of individual sale transactions
  const totalTransactions = LIBRARY.reduce((n, e) => n + e.salesHistory.length, 0);

  return (
    <LibraryContent
      entries={LIBRARY}
      totalValue={totalValue}
      years={years}
      totalTransactions={totalTransactions}
    />
  );
}
