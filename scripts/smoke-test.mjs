const baseUrl = process.env.CONTEXTKIT_BASE_URL ?? "http://localhost:3000";
const apiKey = process.env.CONTEXTKIT_API_KEY;
const payment = process.env.X402_PAYMENT_PAYLOAD;

if (!apiKey || !payment) {
  throw new Error("CONTEXTKIT_API_KEY and X402_PAYMENT_PAYLOAD are required for the production smoke test.");
}

const response = await fetch(`${baseUrl}/api/summarize`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Payment": payment
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "ContextKit should summarize this demo request." }]
  })
});

console.log(response.status, await response.text());
