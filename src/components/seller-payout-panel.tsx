"use client";

import { Check, ExternalLink, LoaderCircle, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useConnect, useConnection, useDisconnect, useSignMessage } from "wagmi";
import { WalletProvider } from "@/components/wallet-provider";

type PayoutRequest = {
  id?: string;
  amountUsd?: number;
  status?: string;
  destination?: string;
  createdAt?: string;
  txHash?: string;
};

type PayoutData = {
  availableUsd?: number;
  reservedUsd?: number;
  paidOutUsd?: number;
  minimumPayoutUsd?: number;
  settlement?: string;
  wallet?: {
    address?: string;
    verifiedAt?: string;
  } | null;
  requests?: PayoutRequest[];
};

type ChallengePayload = {
  message?: string;
  error?: { message?: string };
};

export function SellerPayoutPanel({
  payout,
  onRefresh
}: {
  payout: PayoutData;
  onRefresh: () => Promise<void>;
}) {
  return (
    <WalletProvider>
      <SellerPayoutPanelInner payout={payout} onRefresh={onRefresh} />
    </WalletProvider>
  );
}

function SellerPayoutPanelInner({
  payout,
  onRefresh
}: {
  payout: PayoutData;
  onRefresh: () => Promise<void>;
}) {
  const { address, isConnected } = useConnection();
  const { connectors, connectAsync, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const availableUsd = Number(payout.availableUsd ?? 0);
  const minimumPayoutUsd = Number(payout.minimumPayoutUsd ?? 1);
  const verifiedAddress = payout.wallet?.address;
  const [amount, setAmount] = useState(availableUsd ? String(availableUsd) : "");
  const [phase, setPhase] = useState<"idle" | "challenging" | "signing" | "verifying" | "requesting">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const walletConnector = connectors.find((connector) => connector.type === "injected") ?? connectors[0];
  const busy = phase !== "idle";
  const walletMatches = Boolean(
    address && verifiedAddress && address.toLowerCase() === verifiedAddress.toLowerCase()
  );

  useEffect(() => {
    setAmount(availableUsd > 0 ? String(availableUsd) : "");
  }, [availableUsd]);

  const amountUsd = Number(amount);
  const validAmount = /^\d+(?:\.\d{1,6})?$/.test(amount)
    && amountUsd >= minimumPayoutUsd && amountUsd <= availableUsd;

  async function verifyPayoutWallet() {
    if (!address) return;
    setError("");
    setMessage("");
    try {
      setPhase("challenging");
      const challengeResponse = await fetch("/api/dashboard/payout/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });
      const challenge = await challengeResponse.json() as ChallengePayload;
      if (!challengeResponse.ok || !challenge.message) {
        throw new Error(challenge.error?.message ?? "Could not create the wallet verification challenge.");
      }

      setPhase("signing");
      const signature = await signMessageAsync({ message: challenge.message });
      setPhase("verifying");
      const verifyResponse = await fetch("/api/dashboard/payout/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature })
      });
      const verified = await verifyResponse.json() as ChallengePayload;
      if (!verifyResponse.ok) {
        throw new Error(verified.error?.message ?? "Wallet signature verification failed.");
      }

      setMessage("Payout wallet verified. No transaction or token approval was requested.");
      await onRefresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPhase("idle");
    }
  }

  async function requestPayout() {
    if (!verifiedAddress || busy) return;
    if (!validAmount) {
      setError(`Enter an amount from ${formatAmount(minimumPayoutUsd)} to ${formatAmount(availableUsd)} USDC.`);
      return;
    }
    if (!window.confirm(`Request ${formatAmount(amountUsd)} USDC on Base to ${verifiedAddress}?`)) return;

    setError("");
    setMessage("");
    setPhase("requesting");
    try {
      const response = await fetch("/api/dashboard/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd, expectedDestination: verifiedAddress })
      });
      const payload = await response.json() as ChallengePayload;
      if (!response.ok) throw new Error(payload.error?.message ?? "Payout request failed.");
      setMessage("Payout requested. The amount is reserved until settlement review completes.");
      await onRefresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-amber/20 bg-amber/[0.035]">
      <div className="flex items-center justify-between border-b border-amber/15 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber">Settlement ledger</p>
          <h3 className="mt-1 text-xl font-semibold text-white">USDC payouts on Base</h3>
        </div>
        <BanknoteMark />
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-amber/15 bg-amber/15">
          <PayoutMetric label="Available" value={`$${formatAmount(availableUsd)}`} />
          <PayoutMetric label="Reserved" value={`$${formatAmount(Number(payout.reservedUsd ?? 0))}`} />
          <PayoutMetric label="Paid" value={`$${formatAmount(Number(payout.paidOutUsd ?? 0))}`} />
        </div>

        {!isConnected ? (
          <div className="mt-5 rounded-xl border border-line bg-ink/60 p-4">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber/25 bg-amber/10 text-amber">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-white">{verifiedAddress ? "Connect a wallet to change the receiver." : "Connect the wallet that should receive seller USDC."}</p>
                <p className="mt-1 text-xs leading-5 text-white/43">Verification signs a human-readable message only. ContextKit never requests custody, approval, or spending access.</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isConnecting || !walletConnector}
              onClick={() => walletConnector && void connectAsync({ connector: walletConnector }).catch(() => undefined)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isConnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Connect payout wallet
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-line bg-ink/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">Connected wallet</p>
                <p className="mt-1 font-mono text-sm text-white">{shortAddress(address)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${walletMatches ? "border-mint/25 bg-mint/10 text-mint" : "border-amber/25 bg-amber/10 text-amber"}`}>
                  {walletMatches ? "verified receiver" : "signature required"}
                </span>
                <button type="button" onClick={() => disconnect()} aria-label="Disconnect payout wallet" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-white/40 transition hover:border-coral/40 hover:text-coral">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!walletMatches ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void verifyPayoutWallet()}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber/35 bg-amber/[0.08] px-4 text-sm font-semibold text-amber transition hover:bg-amber/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {verificationLabel(phase)}
              </button>
            ) : null}
          </div>
        )}

        {verifiedAddress ? (
          <div className="mt-5 rounded-xl border border-line bg-ink/60 p-4">
            <label className="block">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">Payout amount (USDC)</span>
              <div className="mt-2 flex h-11 items-center rounded-lg border border-line bg-carbon/70 px-3 focus-within:border-amber/45">
                <input
                  type="number"
                  min={minimumPayoutUsd}
                  max={availableUsd}
                  step="0.000001"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={busy}
                  aria-describedby="payout-preview"
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none"
                />
                <span aria-hidden="true" className="font-mono text-[10px] text-white/35">USDC</span>
              </div>
            </label>
            <p id="payout-preview" className="mt-3 text-xs leading-5 text-white/60">
              {validAmount
                ? `Requested payout: ${formatAmount(amountUsd)} USDC (≈ $${formatAmount(amountUsd)}), subject to review.`
                : `Minimum withdrawal: ${formatAmount(minimumPayoutUsd)} USDC. Enter up to six decimal places.`}
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-white/55">Receiver: {verifiedAddress}</p>
            <button
              type="button"
              disabled={busy || !validAmount}
              onClick={() => void requestPayout()}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {phase === "requesting" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Request USDC payout
            </button>
          </div>
        ) : null}
        {connectError ? <p className="mt-3 text-sm text-coral">{errorMessage(connectError)}</p> : null}
        {error ? <p className="mt-3 rounded-lg border border-coral/20 bg-coral/[0.06] p-3 text-sm text-coral">{error}</p> : null}
        {message ? <p className="mt-3 rounded-lg border border-mint/20 bg-mint/[0.06] p-3 text-sm text-mint">{message}</p> : null}

        <PayoutHistory requests={Array.isArray(payout.requests) ? payout.requests : []} />
      </div>
    </div>
  );
}

function PayoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-carbon/85 p-3">
      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/32">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function PayoutHistory({ requests }: { requests: PayoutRequest[] }) {
  if (!requests.length) {
    return <p className="mt-4 border-t border-amber/10 pt-4 text-xs leading-5 text-white/35">No payout requests yet. Earned funds stay available until you submit one.</p>;
  }

  return (
    <div className="mt-5 border-t border-amber/10 pt-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">Recent payout requests</p>
      <div className="mt-3 grid gap-2">
        {requests.slice(0, 4).map((request, index) => (
          <div key={request.id ?? index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-carbon/65 px-3 py-2.5 text-xs">
            <span className="font-mono text-white">{formatAmount(Number(request.amountUsd ?? 0))} USDC</span>
            <span className="text-white/35">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Pending"}</span>
            {request.status === "paid" && request.txHash && /^0x[0-9a-f]{64}$/i.test(request.txHash) ? (
              <a href={`https://basescan.org/tx/${request.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-aqua hover:underline">
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] ${request.status === "paid" ? "border-mint/25 text-mint" : request.status === "rejected" ? "border-coral/25 text-coral" : "border-amber/25 text-amber"}`}>
              {request.status ?? "requested"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAmount(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function BanknoteMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber/25 bg-amber/10 text-amber">
      <Wallet className="h-4 w-4" />
    </span>
  );
}

function verificationLabel(phase: string) {
  if (phase === "challenging") return "Creating verification message";
  if (phase === "signing") return "Sign message in wallet";
  if (phase === "verifying") return "Verifying signature";
  return "Verify as payout wallet";
}

function shortAddress(address?: Address | string) {
  if (!address) return "Not configured";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "The payout wallet action could not be completed.";
}
