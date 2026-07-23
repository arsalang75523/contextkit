"use client";

import { Check, ExternalLink, LoaderCircle, LogOut, ShieldCheck, Wallet, Zap } from "lucide-react";
import { useState } from "react";
import { BaseError, erc20Abi, type Address, type Hash, isAddress } from "viem";
import { useConnect, useConnection, useDisconnect, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { base } from "wagmi/chains";

export type CreditInvoicePayload = {
  invoice: {
    id: string;
    amountUsdc: string;
    amountUnits: string;
    payTo: string;
    tokenContract: string;
  };
};

type PaymentState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "signing" }
  | { phase: "confirming"; hash: Hash; invoiceId: string }
  | { phase: "verifying"; hash: Hash; invoiceId: string }
  | { phase: "complete"; hash: Hash }
  | { phase: "error"; message: string; hash?: Hash; invoiceId?: string };

export function WalletCreditCheckout({
  amount,
  onAmountChange,
  onCreateInvoice,
  onVerifyPayment
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  onCreateInvoice: () => Promise<CreditInvoicePayload>;
  onVerifyPayment: (invoiceId: string, txHash: Hash) => Promise<void>;
}) {
  const { address, chainId, isConnected } = useConnection();
  const { connectors, connectAsync, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: base.id });
  const [payment, setPayment] = useState<PaymentState>({ phase: "idle" });

  const numericAmount = Number(amount);
  const busy = ["preparing", "signing", "confirming", "verifying"].includes(payment.phase);
  const onBase = chainId === base.id;
  const walletConnector = connectors.find((connector) => connector.type === "injected") ?? connectors[0];

  async function verify(invoiceId: string, hash: Hash) {
    setPayment({ phase: "verifying", invoiceId, hash });
    try {
      await onVerifyPayment(invoiceId, hash);
      setPayment({ phase: "complete", hash });
    } catch (error) {
      setPayment({ phase: "error", message: errorMessage(error), invoiceId, hash });
    }
  }

  async function pay() {
    if (!isConnected || !address) return;
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      setPayment({ phase: "error", message: "Minimum credit purchase is 1 USDC." });
      return;
    }

    try {
      setPayment({ phase: "preparing" });
      if (!onBase) await switchChainAsync({ chainId: base.id });

      const payload = await onCreateInvoice();
      const invoice = payload.invoice;
      if (!invoice?.id || !isAddress(invoice.payTo) || !isAddress(invoice.tokenContract) || !/^\d+$/.test(invoice.amountUnits)) {
        throw new Error("The payment invoice returned invalid onchain details.");
      }

      setPayment({ phase: "signing" });
      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: invoice.tokenContract as Address,
        functionName: "transfer",
        args: [invoice.payTo as Address, BigInt(invoice.amountUnits)],
        chainId: base.id
      });

      setPayment({ phase: "confirming", invoiceId: invoice.id, hash });
      if (!publicClient) throw new Error("Base RPC is unavailable. Retry in a moment.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("The USDC transfer reverted on Base.");
      await verify(invoice.id, hash);
    } catch (error) {
      setPayment({ phase: "error", message: errorMessage(error) });
    }
  }

  if (!isConnected) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/[0.12] via-carbon/95 to-aqua/[0.06] p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-mint/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-mint/30 bg-mint/10 text-mint">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">Direct Base checkout</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Connect wallet. Pay USDC. Credits activate automatically.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Your wallet signs one exact USDC transfer on Base. ContextKit verifies the confirmed receipt before updating your account balance.</p>
            </div>
          </div>
          <div className="flex shrink-0">
            <button
              type="button"
              disabled={isConnecting || !walletConnector}
              onClick={() => walletConnector && void connectAsync({ connector: walletConnector }).catch(() => undefined)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Connect wallet
            </button>
          </div>
        </div>
        {connectError ? <p className="relative mt-4 text-sm text-coral">{errorMessage(connectError)}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-mint/25 bg-carbon/85">
      <div className="flex flex-col gap-4 border-b border-line bg-mint/[0.055] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-mint/30 bg-mint/10 text-mint">
            <Wallet className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-carbon bg-mint" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/38">Connected wallet</p>
            <p className="mt-1 font-mono text-sm text-white">{shortAddress(address)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${onBase ? "border-mint/25 bg-mint/10 text-mint" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
            {onBase ? "Base / ready" : "Wrong network"}
          </span>
          <button type="button" onClick={() => disconnect()} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-white/45 transition hover:border-coral/40 hover:text-coral" aria-label="Disconnect wallet">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_0.78fr] lg:p-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">Choose credit amount</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((value) => (
              <button key={value} type="button" disabled={busy} onClick={() => onAmountChange(String(value))} className={`h-10 rounded-lg border font-mono text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${numericAmount === value ? "border-mint/50 bg-mint/12 text-mint" : "border-line bg-ink/50 text-white/50 hover:border-white/20 hover:text-white"}`}>
                ${value}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/38">Custom amount / USDC</span>
            <div className="mt-2 flex h-12 items-center rounded-xl border border-line bg-ink/70 px-4 focus-within:border-mint/50">
              <span className="font-mono text-sm text-mint">$</span>
              <input type="number" min="1" step="0.01" inputMode="decimal" disabled={busy} value={amount} onChange={(event) => onAmountChange(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent px-2 text-lg font-semibold text-white outline-none disabled:opacity-50" />
              <span className="font-mono text-xs text-white/38">USDC</span>
            </div>
          </label>
          <button type="button" disabled={busy || numericAmount < 1} onClick={() => void pay()} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {paymentLabel(payment, numericAmount, onBase)}
          </button>
        </div>

        <div className="rounded-xl border border-line bg-ink/55 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/38">Settlement path</p>
          <div className="mt-4 space-y-3">
            <CheckoutStep done={isConnected} label="Wallet connected" />
            <CheckoutStep done={onBase} label="Base network selected" />
            <CheckoutStep done={payment.phase === "complete"} active={["signing", "confirming", "verifying"].includes(payment.phase)} label="USDC verified onchain" />
          </div>
          <div className="mt-5 rounded-lg border border-aqua/20 bg-aqua/[0.06] p-3 text-xs leading-5 text-white/52">
            <span className="inline-flex items-center gap-1.5 font-semibold text-aqua"><ShieldCheck className="h-3.5 w-3.5" /> Non-custodial</span>
            <p className="mt-1">ContextKit never receives your wallet key and grants credits only after the Base USDC Transfer event is confirmed.</p>
          </div>
        </div>
      </div>

      {payment.phase === "complete" ? (
        <PaymentNotice hash={payment.hash} text="Payment verified. Your ContextKit credit balance is active." />
      ) : null}
      {payment.phase === "error" ? (
        <div className="border-t border-coral/20 bg-coral/[0.06] px-5 py-4 text-sm text-coral">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{payment.message}</p>
            {payment.hash && payment.invoiceId ? (
              <button type="button" onClick={() => void verify(payment.invoiceId!, payment.hash!)} className="h-9 shrink-0 rounded-lg border border-coral/35 px-3 text-xs font-semibold transition hover:bg-coral/10">Retry verification</button>
            ) : null}
          </div>
          {payment.hash ? <TransactionLink hash={payment.hash} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function CheckoutStep({ done, active = false, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`grid h-7 w-7 place-items-center rounded-full border ${done ? "border-mint/35 bg-mint/10 text-mint" : active ? "border-aqua/35 bg-aqua/10 text-aqua" : "border-line text-white/25"}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : active ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={done ? "text-white/75" : active ? "text-aqua" : "text-white/38"}>{label}</span>
    </div>
  );
}

function PaymentNotice({ hash, text }: { hash: Hash; text: string }) {
  return (
    <div className="border-t border-mint/20 bg-mint/[0.07] px-5 py-4 text-sm text-mint">
      <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" /> {text}</p>
      <TransactionLink hash={hash} />
    </div>
  );
}

function TransactionLink({ hash }: { hash: Hash }) {
  return <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-aqua hover:text-white">View transaction <ExternalLink className="h-3 w-3" /></a>;
}

function paymentLabel(payment: PaymentState, amount: number, onBase: boolean) {
  if (payment.phase === "preparing") return "Preparing secure invoice";
  if (payment.phase === "signing") return "Confirm in wallet";
  if (payment.phase === "confirming") return "Confirming on Base";
  if (payment.phase === "verifying") return "Activating credits";
  if (!onBase) return "Switch to Base and pay";
  return `Pay ${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} USDC`;
}

function shortAddress(address?: Address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function errorMessage(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message;
  return "Wallet payment could not be completed.";
}
