"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { polygon } from "wagmi/chains";

const connectors = connectorsForWallets(
  [{ groupName: "Recommended", wallets: [metaMaskWallet, coinbaseWallet] }],
  { appName: "TEST", projectId: "unused" }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [polygon],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [polygon.id]: http(),
  },
});
