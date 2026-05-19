import { CAMPAIGNS, PRODUCTS } from "@/lib/mock-data";
import CollectionContent from "@/components/collection/CollectionContent";

export const metadata = { title: "Collection — TEST" };

export default function CollectionPage() {
  const exclusiveProducts = PRODUCTS.filter((p) => p.stock_type === "exclusive");
  return <CollectionContent campaigns={CAMPAIGNS} exclusiveProducts={exclusiveProducts} />;
}
