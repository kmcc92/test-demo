"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, cookieToInitialState } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wallet-config";

interface Web3ProviderProps {
  children: React.ReactNode;
  cookie: string | null;
}

export default function Web3Provider({ children, cookie }: Web3ProviderProps) {
  // Computed once per mount — cookie is stable for the lifetime of this provider instance.
  const [initialState] = useState(() => cookieToInitialState(wagmiConfig, cookie));
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
