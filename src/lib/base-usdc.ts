const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function verifyBaseUsdcTransfer(input: {
  rpcUrl: string;
  txHash: string;
  payTo: string;
  tokenContract: string;
  minimumUnits: bigint;
}) {
  const txHash = normalizeTxHash(input.txHash);
  if (!isEvmAddress(input.payTo) || !isEvmAddress(input.tokenContract)) return false;
  const receipt = await rpc<{
    status?: string;
    logs?: Array<{ address?: string; topics?: string[]; data?: string }>;
  }>(input.rpcUrl, "eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1") return false;

  const recipientTopic = addressTopic(input.payTo);
  const token = input.tokenContract.toLowerCase();
  return (receipt.logs ?? []).some((log) => {
    const topics = log.topics ?? [];
    if ((log.address ?? "").toLowerCase() !== token) return false;
    if ((topics[0] ?? "").toLowerCase() !== transferTopic) return false;
    if ((topics[2] ?? "").toLowerCase() !== recipientTopic) return false;
    return BigInt(log.data ?? "0x0") >= input.minimumUnits;
  });
}

export function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function normalizeTxHash(value: string) {
  const txHash = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(txHash)) throw new Error("invalid_transaction_hash");
  return txHash;
}

async function rpc<T>(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const payload = await response.json() as { result?: T; error?: unknown };
  if (!response.ok || payload.error) throw new Error("rpc_request_failed");
  return payload.result ?? null;
}

function addressTopic(address: string) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}
