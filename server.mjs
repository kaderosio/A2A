#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const KADEROS_URL = (process.env.KADEROS_URL || "https://kaderos.io").replace(/\/+$/, "");
const APPROVAL_SECRET = process.env.KADEROS_APPROVAL_SECRET || "";
const LOCAL_EXECUTOR_URL = (process.env.KADEROS_LOCAL_EXECUTOR_URL || "").replace(/\/+$/, "");

function approvalHeaders() {
  return APPROVAL_SECRET ? { "x-kaderos-approval": APPROVAL_SECRET } : {};
}

async function readJson(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { text };
  }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || text || `HTTP ${response.status}`);
  }
  return payload;
}

async function getJson(url, headers = {}) {
  return readJson(await fetch(url, { headers }));
}

async function postJson(url, body, headers = {}) {
  return readJson(await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  }));
}

function toolResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

const server = new McpServer({
  name: "kaderos-a2a-revenue-router",
  version: "0.1.0"
});

server.registerTool(
  "submit_a2a_task",
  {
    title: "Submit A2A Task",
    description: "Queue an agent task in Kaderos for payment-gated execution and receipts.",
    inputSchema: {
      id: z.string().optional(),
      requester: z.string().default("mcp-client"),
      skill: z.string().default("agent-revenue-kit"),
      summary: z.string().min(1),
      targetRevenue: z.number().optional()
    }
  },
  async ({ id, requester, skill, summary, targetRevenue }) => {
    const taskId = id || `mcp-task-${Date.now()}`;
    const payload = await postJson(`${KADEROS_URL}/a2a`, {
      jsonrpc: "2.0",
      id: taskId,
      method: "tasks.send",
      params: {
        id: taskId,
        requester,
        skill,
        targetRevenue,
        message: {
          role: "agent",
          parts: [{ kind: "text", text: summary }]
        }
      }
    }, approvalHeaders());
    return toolResult(payload.result || payload);
  }
);

server.registerTool(
  "get_queue_status",
  {
    title: "Get Queue Status",
    description: "Read the Kaderos persistent queue. Approved details require KADEROS_APPROVAL_SECRET.",
    inputSchema: {}
  },
  async () => {
    return toolResult(await getJson(`${KADEROS_URL}/queue`, approvalHeaders()));
  }
);

server.registerTool(
  "prepare_payment",
  {
    title: "Prepare Payment",
    description: "Ask the local Kaderos executor to create a Stripe payment link for a queued task.",
    inputSchema: {
      taskId: z.string().min(1)
    }
  },
  async ({ taskId }) => {
    if (!LOCAL_EXECUTOR_URL) {
      throw new Error("KADEROS_LOCAL_EXECUTOR_URL is required for prepare_payment.");
    }
    return toolResult(await postJson(`${LOCAL_EXECUTOR_URL}/inbox/execute`, { taskId }));
  }
);

server.registerTool(
  "execute_paid_task",
  {
    title: "Execute Paid Task",
    description: "Execute a paid or manually approved task through the local Kaderos executor.",
    inputSchema: {
      taskId: z.string().min(1),
      paymentConfirmed: z.boolean().default(true)
    }
  },
  async ({ taskId, paymentConfirmed }) => {
    if (!LOCAL_EXECUTOR_URL) {
      throw new Error("KADEROS_LOCAL_EXECUTOR_URL is required for execute_paid_task.");
    }
    return toolResult(await postJson(`${LOCAL_EXECUTOR_URL}/inbox/execute`, {
      taskId,
      force: true,
      paymentConfirmed
    }));
  }
);

server.registerTool(
  "get_execution_receipt",
  {
    title: "Get Execution Receipt",
    description: "Read the public Kaderos receipt JSON for a task.",
    inputSchema: {
      taskId: z.string().min(1)
    }
  },
  async ({ taskId }) => {
    return toolResult(await getJson(`${KADEROS_URL}/receipts/${encodeURIComponent(taskId)}`, {
      Accept: "application/json"
    }));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
