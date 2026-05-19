import { notFound } from "next/navigation";
import { AUCTIONS } from "@/lib/mock-data";
import AuctionDetailClient from "@/components/auctions/AuctionDetailClient";

export function generateStaticParams() {
  return AUCTIONS.map((a) => ({ id: a.id }));
}

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auction = AUCTIONS.find((a) => a.id === id);
  if (!auction) notFound();

  return <AuctionDetailClient auction={auction} />;
}
