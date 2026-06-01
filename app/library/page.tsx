import { LIBRARY, type LibraryEntry, type SaleRecord, type ServiceRecord } from "@/lib/mock-data";
import { getMerchantProductsByType } from "@/lib/merchant-storage";
import LibraryContent from "@/components/library/LibraryContent";

export const metadata = { title: "Library — TEST" };

export default function LibraryPage() {
  const merchantProducts = getMerchantProductsByType("exclusive");

  const merchantLibraryEntries: LibraryEntry[] = merchantProducts.map((m) => ({
    id: `lib-merchant-${m.id}`,
    productId: m.id,
    name: m.name,
    certificateId: m.certificateId ?? "",
    image: m.image,
    salesHistory: [] as SaleRecord[],
    serviceHistory: [] as ServiceRecord[],
    description: m.description,
    category: "accessories",
  }));

  const allEntries = [...LIBRARY, ...merchantLibraryEntries];

  // Use optional chaining to guard entries with no sales history (merchant entries).
  const totalValue = allEntries.reduce((sum, e) => sum + (e.salesHistory[0]?.price ?? 0), 0);

  const allYears = allEntries.flatMap((e) =>
    e.salesHistory.map((s) => parseInt(s.date.slice(0, 4)))
  );
  const years = allYears.length > 0
    ? `${Math.min(...allYears)}–${Math.max(...allYears)}`
    : "–";

  const totalTransactions = allEntries.reduce((n, e) => n + e.salesHistory.length, 0);

  return (
    <LibraryContent
      totalValue={totalValue}
      years={years}
      totalTransactions={totalTransactions}
    />
  );
}
