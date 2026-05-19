import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";

// Placeholder projectId — modal opens and looks real; WalletConnect deep-link won't resolve.
// Replace with a real WalletConnect Cloud project ID before live demo if needed.
export const wagmiConfig = getDefaultConfig({
  appName: "TEST",
  projectId: "demo-placeholder-id",
  chains: [mainnet],
  ssr: true,
});
