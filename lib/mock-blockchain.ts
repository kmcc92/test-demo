// DEPRECATED: replaced by certificate-events.ts timeline
// and Phase 6 blockchain integration. Safe to delete after final audit.

export interface BlockchainMetadata {
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: string;
  contractAddress: `0x${string}`;
  network: string;
  chainId: number;
}

const CONTRACT_ADDRESS =
  "0x4F9b4c4f8D9a1e6A5b3C7d2e8f0a1b9C3e5D7f2" as `0x${string}`;

const RECORDS: Record<string, BlockchainMetadata> = {
  "TEST-GOLD-001": {
    txHash:
      "0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67891" as `0x${string}`,
    blockNumber: BigInt(19_847_231),
    timestamp: "2024-09-12T14:23:07Z",
    contractAddress: CONTRACT_ADDRESS,
    network: "Polygon",
    chainId: 137,
  },
  "TEST-GOLD-002": {
    txHash:
      "0xb2c3d4e5f6789012b2c3d4e5f6789012b2c3d4e5f6789012b2c3d4e5f6789012" as `0x${string}`,
    blockNumber: BigInt(19_847_388),
    timestamp: "2024-09-12T15:41:52Z",
    contractAddress: CONTRACT_ADDRESS,
    network: "Polygon",
    chainId: 137,
  },
  "TEST-REVOKED-001": {
    txHash:
      "0xc3d4e5f67890abcdc3d4e5f67890abcdc3d4e5f67890abcdc3d4e5f67890abcd" as `0x${string}`,
    blockNumber: BigInt(20_013_774),
    timestamp: "2025-01-05T09:12:33Z",
    contractAddress: CONTRACT_ADDRESS,
    network: "Polygon",
    chainId: 137,
  },
  "TEST-STOLEN-001": {
    txHash:
      "0xd4e5f67890abcdefd4e5f67890abcdefd4e5f67890abcdefd4e5f67890abcdef" as `0x${string}`,
    blockNumber: BigInt(20_104_901),
    timestamp: "2024-10-30T18:05:44Z",
    contractAddress: CONTRACT_ADDRESS,
    network: "Polygon",
    chainId: 137,
  },
};

export function getBlockchainData(certificateId: string): BlockchainMetadata | null {
  return RECORDS[certificateId.trim().toUpperCase()] ?? null;
}

export function formatTxHash(hash: `0x${string}`): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function getEtherscanUrl(hash: `0x${string}`): string {
  return `https://polygonscan.com/tx/${hash}`;
}
