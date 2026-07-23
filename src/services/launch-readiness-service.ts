import { AnalyticsService } from "@/services/analytics-service";
import { readEnv } from "@/lib/env";
import { ExperienceService } from "@/services/experience-service";
import { SellerPayoutService } from "@/services/seller-payout-service";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";

type SaleRecord = {
  buyerId: string;
  sellerId: string;
  experienceId: string;
  amountUsd: number;
  identityStrength?: "account" | "wallet" | "declared";
};

export class LaunchReadinessService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async report() {
    const config = readEnv({ env: this.env });
    const [marketplace, sales, payouts, overview, accountKeys] = await Promise.all([
      new ExperienceService(this.env).marketplace({ sort: "latest", limit: 100 }),
      this.kv.getMany<SaleRecord>("experience-sale:"),
      new SellerPayoutService(this.env).adminList(),
      new AnalyticsService(this.env).overview(),
      this.kv.list("account:acct_")
    ]);
    const verifiedSales = sales.filter((sale) => {
      if (sale.identityStrength) {
        return sale.identityStrength === "account" || sale.identityStrength === "wallet";
      }
      return sale.buyerId.startsWith("acct_")
        || sale.buyerId.startsWith("api-key:")
        || sale.buyerId.startsWith("wallet:");
    });
    const buyers = frequency(verifiedSales.map((sale) => sale.buyerId));
    const uniqueBuyers = buyers.size;
    const repeatBuyers = Array.from(buyers.values()).filter((count) => count >= 2).length;
    const verifiedSellers = new Set(marketplace.results.map((listing) => listing.seller.id)).size;
    const averageValidationScore = marketplace.results.length
      ? Math.round(marketplace.results.reduce((total, listing) => total + listing.validationScore, 0) / marketplace.results.length)
      : 0;
    const paidPayouts = payouts.filter((payout) => payout.status === "paid").length;
    const thresholds = {
      registeredAccounts: 50,
      verifiedSellers: 5,
      publicSkills: 10,
      paidInstalls: 25,
      uniqueBuyers: 10,
      repeatBuyers: 3,
      paidPayouts: 3,
      averageValidationScore: 80,
      processedRequests: 1_000
    };
    const actual = {
      registeredAccounts: accountKeys.length,
      verifiedSellers,
      publicSkills: marketplace.totalListings,
      paidInstalls: verifiedSales.length,
      uniqueBuyers,
      repeatBuyers,
      paidPayouts,
      averageValidationScore,
      processedRequests: overview.totalRequests
    };
    const gates = Object.entries(thresholds).map(([key, target]) => {
      const value = actual[key as keyof typeof actual];
      return {
        key,
        value,
        target,
        passed: value >= target,
        progressPercent: Math.min(Math.round((value / target) * 100), 100)
      };
    });
    const passed = gates.filter((gate) => gate.passed).length;

    return {
      status: passed === gates.length ? "eligible-for-governance-review" : "closed-beta",
      tokenLaunch: "not-started",
      summary: {
        passed,
        total: gates.length,
        progressPercent: Math.round((passed / gates.length) * 100)
      },
      gates,
      utilityDesign: [
        { utility: "USDC marketplace settlement", status: "live" },
        { utility: "Stake-based publish capacity", status: "locked" },
        { utility: "Curation and reputation signaling", status: "locked" },
        { utility: "Marketplace fee discounts", status: "locked" }
      ],
      policy: {
        settlementAsset: "USDC on Base",
        launchRule: "No token launch until every usage, quality, buyer-retention, and payout gate passes.",
        betaModeEnabled: config.marketplaceBetaMode,
        beta: config.marketplaceBetaMode
          ? "Invite-only seller onboarding is active; paid installs are monitored."
          : "Seller beta gating is available but disabled; paid installs are monitored."
      },
      generatedAt: new Date().toISOString()
    };
  }
}

function frequency(values: string[]) {
  const result = new Map<string, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}
