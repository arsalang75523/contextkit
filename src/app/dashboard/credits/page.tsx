import { DashboardClient } from "@/components/dashboard-client";
import { WalletProvider } from "@/components/wallet-provider";

export default function CreditsPage() {
  return (
    <WalletProvider>
      <DashboardClient view="credits" />
    </WalletProvider>
  );
}
