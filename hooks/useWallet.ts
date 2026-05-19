"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatAddress } from "@/lib/utils";

export interface WalletState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  truncatedAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  return {
    address,
    isConnected,
    truncatedAddress: address ? formatAddress(address) : null,
    connect: () => openConnectModal?.(),
    disconnect,
  };
}
