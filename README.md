# Kaderos A2A Revenue Router MCP Server

Kaderos adds paid reviews, payments, payment-gated execution, and receipts to A2A and MCP agents.

This package is the installable stdio MCP server for Kaderos. It lets MCP clients submit A2A tasks, inspect queue state, prepare payment links through the local executor, execute paid tasks, and read public receipts.

## Paid A2A Agent Review

Kaderos now sells a concrete `$79` review for agent builders:

- submit an Agent Card, MCP endpoint, repo, or docs URL
- check protocol validity, discovery metadata, skill clarity, trust gaps, payment readiness, and receipt readiness
- receive a scorecard receipt with concrete fixes

Checkout: https://buy.stripe.com/4gMeVf2zUbGebJw3Y97g40c

REST entrypoint: https://kaderos.io/agent-review

## Install

```bash
npm install
npm run check
```

## MCP Client Config

```json
{
  "mcpServers": {
    "kaderos": {
      "command": "node",
      "args": ["/absolute/path/to/kaderos-a2a-revenue-router-mcp/server.mjs"],
      "env": {
        "KADEROS_URL": "https://kaderos.io",
        "KADEROS_APPROVAL_SECRET": "ask-the-kaderos-owner-for-this",
        "KADEROS_LOCAL_EXECUTOR_URL": "http://127.0.0.1:8787"
      }
    }
  }
}
```

## Tools

- `submit_a2a_task`: queue a paid execution request.
- `get_queue_status`: read the Kaderos queue.
- `prepare_payment`: ask the local executor to create a Stripe payment link.
- `execute_paid_task`: execute a paid or approved task.
- `get_execution_receipt`: read the public receipt for a task.

## Public Discovery

- Website: https://kaderos.io
- Paid A2A Agent Review: https://kaderos.io/agent-review
- Checkout: https://buy.stripe.com/4gMeVf2zUbGebJw3Y97g40c
- Docs: https://kaderos.io/docs
- Discovery pack: https://kaderos.io/discovery
- Agent Card: https://kaderos.io/.well-known/agent-card.json
- A2A agent.json: https://kaderos.io/.well-known/agent.json
- MCP manifest: https://kaderos.io/mcp
- OpenAPI: https://kaderos.io/openapi.json
- llms.txt: https://kaderos.io/llms.txt

## Security Model

Public calls without `KADEROS_APPROVAL_SECRET` are dry-run or redacted where applicable. Live fulfillment runs through the protected local executor, and paid execution is gated by Stripe payment state or explicit local approval.
