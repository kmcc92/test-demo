// Unsplash CDN helper — portrait crop suits 3:4 product cards
function u(id: string, w = 600, h = 800) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

// All auction end dates are set well past any possible presentation date.
// Update AUCTION_DATES before each presentation to ensure 48h+ buffer.
export const AUCTION_DATES = {
  FEATURED: "2026-08-15T18:00:00Z",
  AUCTION_2: "2026-08-18T12:00:00Z",
  AUCTION_3: "2026-08-20T20:00:00Z",
} as const;

export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: "outerwear" | "tailoring" | "knitwear" | "footwear" | "accessories";
  stock_type: "regular" | "exclusive";
  edition?: string;
  certificateId?: string;
  description: string;
}

export interface Bid {
  id: string;
  address: string;
  amount: number;
  timestamp: string;
}

export interface Auction {
  id: string;
  name: string;
  image: string;
  currentBid: number;
  endDate: string;
  bids: Bid[];
  featured: boolean;
  type: "reserve" | "dutch" | "buy-now";
  certificateId: string;
  description: string;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  slug: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Cashmere Overcoat No. I",
    price: 3800,
    images: [u("photo-1603906650843-b58e94d9df4d")],
    category: "outerwear",
    stock_type: "regular",
    description:
      "Single-breasted construction in Italian cashmere. Unlined, drop-shouldered.",
  },
  {
    id: "prod-002",
    name: "Worsted Wool Blazer",
    price: 2200,
    images: [u("photo-1619102814948-e164e584cf0c")],
    category: "tailoring",
    stock_type: "regular",
    description:
      "Two-button, peak lapel. Cut from a 130s worsted wool sourced in Biella.",
  },
  {
    id: "prod-003",
    name: "Merino Crew Pullover",
    price: 680,
    images: [u("photo-1574201635302-388dd92a4c3f")],
    category: "knitwear",
    stock_type: "regular",
    description: "12-gauge knit in superfine merino. Relaxed fit, ribbed cuffs.",
  },
  {
    id: "prod-004",
    name: "Leather Derby No. III",
    price: 1150,
    images: [u("photo-1668069226492-508742b03147")],
    category: "footwear",
    stock_type: "regular",
    description: "Goodyear-welted. Calf leather upper, leather sole.",
  },
  {
    id: "excl-001",
    name: "Archive Trench — Edition 001",
    price: 8500,
    images: [u("photo-1617391258031-f8d80b22fb35")],
    category: "outerwear",
    stock_type: "exclusive",
    edition: "001 / 010",
    certificateId: "TEST-GOLD-001",
    description:
      "Reissued from the 2019 archive. Cotton gabardine, hand-finished, certified on-chain.",
  },
  {
    id: "excl-002",
    name: "Zero-Seam Coat — Edition 002",
    price: 12000,
    images: [u("photo-1680690395101-1b2a56c0ac21")],
    category: "outerwear",
    stock_type: "exclusive",
    edition: "002 / 010",
    certificateId: "TEST-GOLD-002",
    description:
      "Bonded wool, heat-fused seams. No visible stitching. One of ten.",
  },
  {
    id: "excl-003",
    name: "Leather Jacket — Edition 003",
    price: 9200,
    images: [u("photo-1521223890158-f9f7c3d5d504")],
    category: "outerwear",
    stock_type: "exclusive",
    edition: "003 / 010",
    certificateId: "TEST-GOLD-003",
    description:
      "Nappa lambskin, washed finish. Signed and numbered interior lining.",
  },
  {
    id: "excl-004",
    name: "Silk Dress Shirt — Edition 004",
    price: 2800,
    images: [u("photo-1621072156002-e2fccdc0b176")],
    category: "tailoring",
    stock_type: "exclusive",
    edition: "004 / 010",
    certificateId: "TEST-GOLD-004",
    description: "Hand-rolled collar, mother-of-pearl buttons. Charmeuse silk.",
  },
];

export const AUCTIONS: Auction[] = [
  {
    id: "auction-001",
    name: "Prototype Coat — Sample 0",
    image: u("photo-1676716105765-e19fe6a01851"),
    currentBid: 24000,
    endDate: AUCTION_DATES.FEATURED,
    featured: true,
    type: "reserve",
    certificateId: "TEST-AUC-001",
    description:
      "The original sample from the 2022 collection. Never worn. Accompanied by original pattern sheets and a signed certificate of authenticity.",
    bids: [
      {
        id: "bid-001",
        address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        amount: 24000,
        timestamp: "2026-05-16T14:22:00Z",
      },
      {
        id: "bid-002",
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        amount: 21500,
        timestamp: "2026-05-15T09:45:00Z",
      },
      {
        id: "bid-003",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        amount: 19000,
        timestamp: "2026-05-14T16:30:00Z",
      },
      {
        id: "bid-004",
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        amount: 16500,
        timestamp: "2026-05-13T11:00:00Z",
      },
    ],
  },
  {
    id: "auction-002",
    name: "Archive Leather Jacket — 1991",
    image: u("photo-1602370463198-086436840055"),
    currentBid: 14500,
    endDate: AUCTION_DATES.AUCTION_2,
    featured: false,
    type: "reserve",
    certificateId: "TEST-AUC-002",
    description:
      "First-generation leather piece from the original TEST collection. Exceptional provenance.",
    bids: [
      {
        id: "bid-005",
        address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        amount: 14500,
        timestamp: "2026-05-16T10:00:00Z",
      },
      {
        id: "bid-006",
        address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
        amount: 12000,
        timestamp: "2026-05-15T08:30:00Z",
      },
    ],
  },
  {
    id: "auction-003",
    name: "Debut Season Bag — Prototype",
    image: u("photo-1584917865442-de89df76afd3"),
    currentBid: 8800,
    endDate: AUCTION_DATES.AUCTION_3,
    featured: false,
    type: "buy-now",
    certificateId: "TEST-AUC-003",
    description:
      "The prototype bag from the opening season. Calfskin, hand-stitched. Unique piece.",
    bids: [
      {
        id: "bid-007",
        address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
        amount: 8800,
        timestamp: "2026-05-16T20:15:00Z",
      },
      {
        id: "bid-008",
        address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
        amount: 7500,
        timestamp: "2026-05-15T14:00:00Z",
      },
      {
        id: "bid-009",
        address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
        amount: 6200,
        timestamp: "2026-05-14T09:00:00Z",
      },
    ],
  },
];

export const CAMPAIGNS: Campaign[] = [
  {
    id: "campaign-001",
    title: "SS26 — The Weight of Cloth",
    subtitle: "New collection. Authenticated.",
    image: u("photo-1592327877233-90b9bfd92e48", 1400, 900),
    href: "/shop",
  },
  {
    id: "campaign-002",
    title: "Exclusive — Ten Pieces Only",
    subtitle: "Each serialized. None repeated.",
    image: u("photo-1635205383325-aa3e6fb5ba55", 1400, 900),
    href: "/exclusive",
  },
];

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "journal-001",
    title: "On the Chain of Custody",
    excerpt:
      "What does it mean for a garment to have a permanent, unalterable record? We consider the philosophy behind provenance.",
    image: u("photo-1601379327928-bedfaf9da2d0", 1200, 500),
    date: "2026-04-20",
    slug: "on-the-chain-of-custody",
  },
  {
    id: "journal-002",
    title: "The Archive Coat",
    excerpt:
      "How a single prototype becomes a collectible — and why the distinction between a garment and an object matters.",
    image: u("photo-1573545289441-827c028f7a3b", 1200, 500),
    date: "2026-03-15",
    slug: "the-archive-coat",
  },
];

export interface SaleRecord {
  date: string;
  price: number;
  owner: string;
}

export interface LibraryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  certificateId: string;
  productId?: string; // links this library record to a purchasable product by product.id
  salesHistory: SaleRecord[]; // newest first; minimum one entry
}

export const LIBRARY: LibraryEntry[] = [
  {
    id: "lib-001",
    name: "SS19 Prototype Jacket",
    description:
      "Original sample from the 2019 opening season. Never commercially released. Single piece.",
    category: "outerwear",
    image: u("photo-1617391258031-f8d80b22fb35"),
    certificateId: "TEST-GOLD-005",
    productId: "excl-001",
    salesHistory: [
      { date: "2024-07-03", price: 24000, owner: "Marcus Osei" },
      { date: "2021-09-14", price: 21500, owner: "Private" },
      { date: "2019-03-12", price: 18500, owner: "James Whitfield" },
    ],
  },
  {
    id: "lib-002",
    name: "Archive Wool Coat No. I",
    description:
      "First production coat. Unlined, unfinished edges. Pre-authentication era piece, retroactively certified.",
    category: "outerwear",
    image: u("photo-1680690395101-1b2a56c0ac21"),
    certificateId: "TEST-GOLD-006",
    productId: "excl-002",
    salesHistory: [
      { date: "2019-08-20", price: 12000, owner: "Private" },
    ],
  },
  {
    id: "lib-003",
    name: "Debut Season Trousers",
    description:
      "Wide-leg construction from the inaugural collection. Unfinished seam allowance — an intentional detail.",
    category: "tailoring",
    image: u("photo-1603906650843-b58e94d9df4d"),
    certificateId: "TEST-GOLD-007",
    productId: "prod-001",
    salesHistory: [
      { date: "2023-04-08", price: 5800, owner: "Charlotte Voss" },
      { date: "2020-01-15", price: 4200, owner: "Elena Marchetti" },
    ],
  },
  {
    id: "lib-004",
    name: "Hand-Stitched Overshirt",
    description:
      "Seven hours of hand-stitching per piece. Limited to three; only one certified and sold.",
    category: "tailoring",
    image: u("photo-1619102814948-e164e584cf0c"),
    certificateId: "TEST-GOLD-008",
    productId: "prod-002",
    salesHistory: [
      { date: "2020-06-08", price: 6800, owner: "Private" },
    ],
  },
  {
    id: "lib-005",
    name: "FW20 Campaign Coat",
    description:
      "Worn in the inaugural campaign. Single piece, never duplicated. Accompanied by original campaign photography.",
    category: "outerwear",
    image: u("photo-1574201635302-388dd92a4c3f"),
    certificateId: "TEST-GOLD-009",
    productId: "prod-003",
    salesHistory: [
      { date: "2025-01-18", price: 58000, owner: "Private" },
      { date: "2023-04-22", price: 48000, owner: "Thomas Brennan" },
      { date: "2022-08-05", price: 42000, owner: "Private" },
      { date: "2021-03-11", price: 38000, owner: "Elena Marchetti" },
      { date: "2020-11-30", price: 34000, owner: "James Whitfield" },
    ],
  },
  {
    id: "lib-006",
    name: "Raw Silk Blazer",
    description:
      "Pre-production sample in experimental silk sourced from Suzhou. The fabric supply was never renewed.",
    category: "tailoring",
    image: u("photo-1668069226492-508742b03147"),
    certificateId: "TEST-GOLD-010",
    productId: "prod-004",
    salesHistory: [
      { date: "2024-03-22", price: 11200, owner: "Private" },
      { date: "2021-02-14", price: 9500, owner: "Private" },
    ],
  },
  {
    id: "lib-007",
    name: "Archive Leather Belt",
    description:
      "Hand-cut from a single hide. The original tooling is no longer available; no reproduction is possible.",
    category: "accessories",
    image: u("photo-1507003211169-0a1dd7228f2d"),
    certificateId: "TEST-GOLD-011",
    salesHistory: [
      { date: "2021-07-22", price: 1800, owner: "Ren Nakamura" },
    ],
  },
  {
    id: "lib-008",
    name: "Cashmere Roll-Neck No. I",
    description:
      "16-gauge cashmere, hand-finished cuffs. Made before the Loro Piana sourcing agreement was established.",
    category: "knitwear",
    image: u("photo-1516762689617-e1cffcef479d"),
    certificateId: "TEST-GOLD-012",
    salesHistory: [
      { date: "2024-11-02", price: 4600, owner: "William Park" },
      { date: "2023-02-17", price: 3800, owner: "Private" },
      { date: "2021-10-05", price: 3200, owner: "Charlotte Voss" },
    ],
  },
  {
    id: "lib-009",
    name: "SS22 Atelier Coat",
    description:
      "Made for the Paris showroom opening. One of three produced; the only piece to leave the atelier.",
    category: "outerwear",
    image: u("photo-1512436991641-6745cdb1723f"),
    certificateId: "TEST-GOLD-013",
    salesHistory: [
      { date: "2025-06-01", price: 52000, owner: "Private" },
      { date: "2024-10-15", price: 47500, owner: "Ren Nakamura" },
      { date: "2023-07-20", price: 43000, owner: "Private" },
      { date: "2022-03-18", price: 38500, owner: "Private" },
    ],
  },
  {
    id: "lib-010",
    name: "Hand-Dyed Linen Jacket",
    description:
      "Natural indigo dye, each piece dyed differently. The shade carried by this certificate is unrepeatable.",
    category: "outerwear",
    image: u("photo-1521223890158-f9f7c3d5d504"),
    certificateId: "TEST-GOLD-014",
    productId: "excl-003",
    salesHistory: [
      { date: "2022-09-27", price: 7400, owner: "Marcus Osei" },
    ],
  },
  {
    id: "lib-011",
    name: "Archive Derby Prototype",
    description:
      "Pre-production derby. The Goodyear welt construction was refined over five iterations after this pair.",
    category: "footwear",
    image: u("photo-1558618666-fcd25c85cd64"),
    certificateId: "TEST-GOLD-015",
    salesHistory: [
      { date: "2025-03-14", price: 7200, owner: "Isabelle Fontaine" },
      { date: "2023-01-11", price: 5600, owner: "Private" },
    ],
  },
  {
    id: "lib-012",
    name: "Bonded Wool Trousers",
    description:
      "From the experimental bonding programme. No visible seams. One of the first bonded garments produced.",
    category: "tailoring",
    image: u("photo-1506794778202-cad84cf45f1d"),
    certificateId: "TEST-GOLD-016",
    salesHistory: [
      { date: "2023-06-30", price: 8900, owner: "Isabelle Fontaine" },
    ],
  },
  {
    id: "lib-013",
    name: "FW23 Technical Outerwear",
    description:
      "Prototype for the bonded outerwear line. Unique fabrication never reproduced at commercial scale.",
    category: "outerwear",
    image: u("photo-1490481651871-ab68de25d43d"),
    certificateId: "TEST-GOLD-017",
    salesHistory: [
      { date: "2025-09-08", price: 31000, owner: "Private" },
      { date: "2025-02-14", price: 26500, owner: "Thomas Brennan" },
      { date: "2024-02-08", price: 22000, owner: "Private" },
    ],
  },
  {
    id: "lib-014",
    name: "Inaugural Season Dress Shirt",
    description:
      "First dress shirt produced by TEST. Hand-rolled collar, mother-of-pearl buttons from a discontinued supplier.",
    category: "tailoring",
    image: u("photo-1621072156002-e2fccdc0b176"),
    certificateId: "TEST-GOLD-018",
    productId: "excl-004",
    salesHistory: [
      { date: "2025-11-21", price: 6400, owner: "James Whitfield" },
      { date: "2024-11-15", price: 4800, owner: "William Park" },
    ],
  },
];
