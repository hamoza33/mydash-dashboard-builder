/**
 * MCP Client wrapper that makes HTTP POST requests to configured
 * MCP endpoints with auth token from env. Handles errors gracefully.
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

export class McpClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authToken = authToken || process.env.MCP_AUTH_TOKEN || "";
  }

  /**
   * Calls an MCP tool endpoint with the given arguments.
   */
  async callTool(toolCall: McpToolCall): Promise<McpResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/call-tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken
            ? { Authorization: `Bearer ${this.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          tool: toolCall.tool,
          arguments: toolCall.arguments,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `MCP call failed (${response.status}): ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
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
