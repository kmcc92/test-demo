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
  sizes?: string[];
  category: "outerwear" | "tops" | "footwear" | "accessories";
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
    name: "Archive Knit Poncho No. I",
    price: 3800,
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    category: "outerwear",
    stock_type: "regular",
    description:
      "An oversized knit silhouette from the early archive. One of twelve produced.",
  },
  {
    id: "prod-002",
    name: "Structured Blazer No. II",
    price: 2200,
    images: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
    ],
    sizes: ["S", "M", "L", "XL"],
    category: "tops",
    stock_type: "regular",
    description:
      "A single-button blazer in wool blend. Clean lapels, minimal construction.",
  },
  {
    id: "prod-003",
    name: "FW20 Womenswear Campaign Piece",
    price: 680,
    images: [
      "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80",
    ],
    sizes: ["XS", "S", "M", "L"],
    category: "tops",
    stock_type: "regular",
    description: "A casual silhouette from the FW20 campaign collection. Limited run.",
  },
  {
    id: "prod-004",
    name: "Archive Trainer No. I",
    price: 1150,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
      "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&q=80",
    ],
    sizes: ["36", "38", "40", "42", "44"],
    category: "footwear",
    stock_type: "regular",
    description: "A low-profile sneaker from the footwear archive. Clean construction, minimal branding.",
  },
  {
    id: "excl-001",
    name: "SS19 Prototype Jacket — Edition 001",
    price: 8500,
    images: ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80"],
    category: "outerwear",
    stock_type: "exclusive",
    edition: "001 / 010",
    certificateId: "TEST-GOLD-001",
    description:
      "A sample jacket from the SS19 atelier archive. One of one.",
  },
  {
    id: "excl-002",
    name: "Archive Tote — Edition 002",
    price: 12000,
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"],
    category: "accessories",
    stock_type: "exclusive",
    edition: "002 / 010",
    certificateId: "TEST-GOLD-002",
    description:
      "A structured carry piece from the archive collection. Hand-finished with premium hardware.",
  },
  {
    id: "excl-003",
    name: "Archive Leather Jacket — Edition 003",
    price: 9200,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80"],
    category: "outerwear",
    stock_type: "exclusive",
    edition: "003 / 010",
    certificateId: "TEST-GOLD-003",
    description:
      "A structured leather jacket from the archive. Full grain leather, minimal hardware.",
  },
  {
    id: "excl-004",
    name: "Silk Dress Shirt — Edition 004",
    price: 2800,
    images: ["https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80"],
    category: "tops",
    stock_type: "exclusive",
    edition: "004 / 010",
    certificateId: "TEST-GOLD-004",
    description: "A hand-finished silk dress shirt from the archive. Eight produced.",
  },
];

export const AUCTIONS: Auction[] = [
  {
    id: "auction-001",
    name: "Celebrity Worn Collection No. I",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    currentBid: 24000,
    endDate: AUCTION_DATES.FEATURED,
    featured: true,
    type: "reserve",
    certificateId: "TEST-AUC-001",
    description:
      "A signature piece worn by a notable figure. Authenticated and certified. One of one.",
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
    name: "Celebrity Worn Collection No. II",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80",
    currentBid: 14500,
    endDate: AUCTION_DATES.AUCTION_2,
    featured: false,
    type: "reserve",
    certificateId: "TEST-AUC-002",
    description:
      "A second signature piece from the celebrity archive. Fully authenticated with provenance chain.",
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
    name: "Celebrity Worn Suit — Authenticated",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80",
    currentBid: 8800,
    endDate: AUCTION_DATES.AUCTION_3,
    featured: false,
    type: "buy-now",
    certificateId: "TEST-AUC-003",
    description:
      "A tailored mens suit worn at a major public event. Certified and archived. Unique piece.",
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

export type ServiceType = "Cleaning" | "Repair" | "Alteration" | "Authentication Inspection" | "Leather Conditioning";

export interface ServiceRecord {
  id: string;
  date: string;
  type: ServiceType;
  performedBy: string;
  notes: string;
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
  serviceHistory?: ServiceRecord[];
}

export const LIBRARY: LibraryEntry[] = [
  {
    id: "lib-001",
    name: "SS19 Prototype Jacket",
    description:
      "Original sample from the 2019 opening season. Never commercially released. Single piece.",
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
    certificateId: "TEST-GOLD-005",
    productId: "excl-001",
    salesHistory: [
      { date: "2024-07-03", price: 24000, owner: "Marcus Osei" },
      { date: "2021-09-14", price: 21500, owner: "Private" },
      { date: "2019-03-12", price: 18500, owner: "James Whitfield" },
    ],
    serviceHistory: [
      {
        id: "svc-001-1",
        date: "2024-11-14",
        type: "Authentication Inspection",
        performedBy: "TEST Atelier, Paris",
        notes: "Annual authentication review. Certificate integrity confirmed. No alterations detected.",
      },
      {
        id: "svc-001-2",
        date: "2023-03-08",
        type: "Cleaning",
        performedBy: "Maison Berthier, London",
        notes: "Full complimentary cleaning and conditioning. Interior lining inspected and pressed.",
      },
      {
        id: "svc-001-3",
        date: "2021-10-20",
        type: "Repair",
        performedBy: "TEST Atelier, Paris",
        notes: "Button restoration — two archive horn buttons replaced with matched originals from the SS19 reserve stock.",
      },
    ],
  },
  {
    id: "lib-002",
    name: "Archive Tote — Edition I",
    description:
      "A structured carry piece from the archive collection. Hand-finished with premium hardware.",
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    certificateId: "TEST-GOLD-006",
    productId: "excl-002",
    salesHistory: [
      { date: "2019-08-20", price: 12000, owner: "Private" },
    ],
    serviceHistory: [
      {
        id: "svc-002-1",
        date: "2024-06-03",
        type: "Authentication Inspection",
        performedBy: "TEST Atelier, Paris",
        notes: "Certificate re-confirmed. Hardware integrity checked — all original fittings intact.",
      },
      {
        id: "svc-002-2",
        date: "2022-09-15",
        type: "Cleaning",
        performedBy: "Maison Berthier, London",
        notes: "Leather exterior cleaned and conditioned with archive-formula treatment. Interior structured lining steamed.",
      },
    ],
  },
  {
    id: "lib-003",
    name: "Archive Knit Poncho No. I",
    description:
      "An oversized knit silhouette from the early archive. One of twelve produced.",
    category: "tailoring",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
    certificateId: "TEST-GOLD-007",
    productId: "prod-001",
    salesHistory: [
      { date: "2023-04-08", price: 5800, owner: "Charlotte Voss" },
      { date: "2020-01-15", price: 4200, owner: "Elena Marchetti" },
    ],
  },
  {
    id: "lib-004",
    name: "Structured Blazer No. II",
    description:
      "A single-button blazer in wool blend. Clean lapels, minimal construction.",
    category: "tailoring",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    certificateId: "TEST-GOLD-008",
    productId: "prod-002",
    salesHistory: [
      { date: "2020-06-08", price: 6800, owner: "Private" },
    ],
  },
  {
    id: "lib-005",
    name: "FW20 Womenswear Campaign Piece",
    description:
      "A casual silhouette from the FW20 campaign collection. Limited run.",
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&q=80",
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
    name: "Archive Trainer No. I",
    description:
      "A low-profile sneaker from the footwear archive. Clean construction, minimal branding.",
    category: "tailoring",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    certificateId: "TEST-GOLD-010",
    productId: "prod-004",
    salesHistory: [
      { date: "2024-03-22", price: 11200, owner: "Private" },
      { date: "2021-02-14", price: 9500, owner: "Private" },
    ],
  },
  {
    id: "lib-007",
    name: "FW21 Womenswear Second Edition",
    description:
      "A campaign piece from the second FW21 womenswear drop. Archive only.",
    category: "accessories",
    image: "https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&q=80",
    certificateId: "TEST-GOLD-011",
    salesHistory: [
      { date: "2021-07-22", price: 1800, owner: "Ren Nakamura" },
    ],
  },
  {
    id: "lib-008",
    name: "Menswear Archive — Season III",
    description:
      "A foundational menswear piece from the third season archive collection.",
    category: "knitwear",
    image: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=800&q=80",
    certificateId: "TEST-GOLD-012",
    salesHistory: [
      { date: "2024-11-02", price: 4600, owner: "William Park" },
      { date: "2023-02-17", price: 3800, owner: "Private" },
      { date: "2021-10-05", price: 3200, owner: "Charlotte Voss" },
    ],
  },
  {
    id: "lib-009",
    name: "Archive Green Overshirt",
    description:
      "A cotton overshirt in archive green. Produced in a single run of eight.",
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
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
    name: "Archive Leather Jacket No. I",
    description:
      "A structured leather jacket from the archive. Full grain leather, minimal hardware.",
    category: "outerwear",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    certificateId: "TEST-GOLD-014",
    productId: "excl-003",
    salesHistory: [
      { date: "2022-09-27", price: 7400, owner: "Marcus Osei" },
    ],
    serviceHistory: [
      {
        id: "svc-010-1",
        date: "2025-01-22",
        type: "Leather Conditioning",
        performedBy: "Maison Berthier, London",
        notes: "Full grain leather treated with protective conditioning oil. Collar and cuff edges reinforced.",
      },
      {
        id: "svc-010-2",
        date: "2023-07-11",
        type: "Authentication Inspection",
        performedBy: "TEST Atelier, Paris",
        notes: "Provenance chain reviewed and sealed. Hardware confirmed original. No signs of alteration.",
      },
      {
        id: "svc-010-3",
        date: "2022-11-04",
        type: "Alteration",
        performedBy: "TEST Atelier, Paris",
        notes: "Sleeve length adjusted by 8mm per owner specification. Original stitching pattern preserved.",
      },
    ],
  },
  {
    id: "lib-011",
    name: "Womenswear Casual Collection No. III",
    description:
      "A double-breasted wool overcoat from the archive. Structured silhouette, horn buttons.",
    category: "footwear",
    image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800&q=80",
    certificateId: "TEST-GOLD-015",
    salesHistory: [
      { date: "2025-03-14", price: 7200, owner: "Isabelle Fontaine" },
      { date: "2023-01-11", price: 5600, owner: "Private" },
    ],
  },
  {
    id: "lib-012",
    name: "Archive Roll-Neck Sweater",
    description:
      "A fine gauge roll-neck in merino wool. Part of the knitwear archive series.",
    category: "tailoring",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80",
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
    image: "https://images.unsplash.com/photo-1617391258031-f8d80b22fb35?w=800&q=80",
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
    image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80",
    certificateId: "TEST-GOLD-018",
    productId: "excl-004",
    salesHistory: [
      { date: "2025-11-21", price: 6400, owner: "James Whitfield" },
      { date: "2024-11-15", price: 4800, owner: "William Park" },
    ],
    serviceHistory: [
      {
        id: "svc-014-1",
        date: "2025-10-09",
        type: "Cleaning",
        performedBy: "Maison Berthier, London",
        notes: "Silk exterior hand-washed using archive protocol. Mother-of-pearl buttons individually cleaned and polished.",
      },
      {
        id: "svc-014-2",
        date: "2025-02-17",
        type: "Authentication Inspection",
        performedBy: "TEST Atelier, Paris",
        notes: "Ownership transfer inspection completed. Certificate updated to reflect current owner. All original components verified.",
      },
      {
        id: "svc-014-3",
        date: "2024-12-03",
        type: "Repair",
        performedBy: "TEST Atelier, Paris",
        notes: "Interior collar lining re-stitched using original thread weight. Hand-rolled collar edge re-pressed.",
      },
    ],
  },
];

export const SERVICE_HISTORY: Record<string, ServiceRecord[]> = {
  "TEST-GOLD-001": [
    {
      id: "svc-g001-1",
      date: "2025-09-12",
      type: "Authentication Inspection",
      performedBy: "TEST Atelier, Paris",
      notes: "Annual certificate review. Provenance chain integrity confirmed. No alterations detected.",
    },
    {
      id: "svc-g001-2",
      date: "2024-04-18",
      type: "Cleaning",
      performedBy: "Maison Berthier, London",
      notes: "Full complimentary cleaning. Interior lining inspected and pressed. Exterior seams reinforced.",
    },
    {
      id: "svc-g001-3",
      date: "2023-01-30",
      type: "Repair",
      performedBy: "TEST Atelier, Paris",
      notes: "Button restoration — two archive horn buttons replaced with matched originals from SS19 reserve stock.",
    },
  ],
  "TEST-GOLD-002": [
    {
      id: "svc-g002-1",
      date: "2025-06-05",
      type: "Authentication Inspection",
      performedBy: "TEST Atelier, Paris",
      notes: "Transfer inspection completed. Certificate re-confirmed following ownership change.",
    },
    {
      id: "svc-g002-2",
      date: "2024-02-21",
      type: "Cleaning",
      performedBy: "Maison Berthier, London",
      notes: "Leather exterior conditioned with archive-formula treatment. Hardware polished. Interior steamed.",
    },
  ],
};
