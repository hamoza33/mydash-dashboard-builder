/**
 * MCP Client wrapper that makes JSON-RPC 2.0 HTTP POST requests to configured
 * MCP endpoints with Bearer token auth. Handles errors gracefully.
 */

export interface McpToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class McpClient {
  private baseUrl: string;
  private authToken: string;
  private requestId: number;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authToken = authToken || process.env.MCP_AUTH_TOKEN || "";
    this.requestId = 0;
  }

  /**
   * Calls an MCP tool using JSON-RPC 2.0 protocol.
   * POST to the MCP endpoint with:
   *   Authorization: Bearer {token}
   *   Body: {"jsonrpc":"2.0","id":N,"method":"tools/call","params":{"name":"tool_name","arguments":{...}}}
   */
  async callTool(toolCall: McpToolCall): Promise<McpResponse> {
    this.requestId++;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken
            ? { Authorization: `Bearer ${this.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: this.requestId,
          method: "tools/call",
          params: {
            name: toolCall.tool,
            arguments: toolCall.arguments,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `MCP call failed (${response.status}): ${errorText}`,
        };
      }

      const jsonRpc = (await response.json()) as JsonRpcResponse;

      // Handle JSON-RPC error response
      if (jsonRpc.error) {
        return {
          success: false,
          error: `MCP RPC error (${jsonRpc.error.code}): ${jsonRpc.error.message}`,
        };
      }

      // Extract data from JSON-RPC result
      // MCP tools typically return content array with text items
      if (jsonRpc.result?.content) {
        const textContent = jsonRpc.result.content
          .filter((item) => item.type === "text" && item.text)
          .map((item) => item.text)
          .join("");

        // Try to parse as JSON, otherwise return as string
        try {
          const parsed = JSON.parse(textContent);
          return { success: true, data: parsed };
        } catch {
          return { success: true, data: textContent };
        }
      }

      return { success: true, data: jsonRpc.result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return { success: false, error: `MCP call error: ${message}` };
    }
  }

  /**
   * Creates a pre-configured MCP client for a given endpoint URL from env.
   */
  static fromEnv(envKey: string): McpClient | null {
    const url = process.env[envKey];
    if (!url) {
      return null;
    }
    return new McpClient(url);
  }
}

// Pre-configured MCP client factories for each service
export const mcpClients = {
  codNetwork: () => McpClient.fromEnv("COD_NETWORK_MCP_URL"),
  lightfunnels: () => McpClient.fromEnv("LIGHTFUNNELS_MCP_URL"),
  tracking: () => McpClient.fromEnv("TRACKING_MCP_URL"),
  tiktok: () => McpClient.fromEnv("TIKTOK_MCP_URL"),
  facebook: () => McpClient.fromEnv("FACEBOOK_MCP_URL"),
  sheet: () => McpClient.fromEnv("SHEET_MCP_URL"),
  import: () => McpClient.fromEnv("IMPORT_MCP_URL"),
};
