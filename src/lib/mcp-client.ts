/**
 * MCP Client wrapper that makes JSON-RPC 2.0 HTTP POST requests to configured
 * MCP endpoints with Bearer token auth. Supports both JSON and SSE responses.
 * Implements MCP Streamable HTTP transport with session management.
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
    isError?: boolean;
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
  private initialized: boolean;
  private sessionId: string | null;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authToken = authToken || process.env.MCP_AUTH_TOKEN || "";
    this.requestId = 0;
    this.initialized = false;
    this.sessionId = null;
  }

  /**
   * Builds the common headers for MCP requests.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    return headers;
  }

  /**
   * Sends the MCP initialize handshake if not already done.
   * Captures the session ID from the response for subsequent requests.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    this.requestId++;
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: this.requestId,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "mydash-dashboard-builder",
              version: "1.0.0",
            },
          },
        }),
      });

      if (response.ok) {
        // Capture session ID from response header
        const mcpSessionId = response.headers.get("mcp-session-id");
        if (mcpSessionId) {
          this.sessionId = mcpSessionId;
        }

        // Read the response body to complete the handshake
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("text/event-stream")) {
          await response.text();
        } else {
          await response.json();
        }

        // Send initialized notification (with session ID if we have one)
        await fetch(this.baseUrl, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized",
          }),
        });
      }
    } catch {
      // Initialization failed but we can still try tool calls
      // Some servers don't require initialization
    }

    this.initialized = true;
  }

  /**
   * Parses a JSON-RPC response into an McpResponse.
   */
  private parseJsonRpcResponse(jsonRpc: JsonRpcResponse): McpResponse {
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

      // Check if the MCP server returned an error message in the content
      if (jsonRpc.result.isError || textContent.toLowerCase().startsWith("error executing tool")) {
        return { success: false, error: textContent };
      }

      // Try to parse as JSON, otherwise return as string
      try {
        const parsed = JSON.parse(textContent);
        return { success: true, data: parsed };
      } catch {
        return { success: true, data: textContent };
      }
    }

    return { success: true, data: jsonRpc.result };
  }

  /**
   * Calls an MCP tool using JSON-RPC 2.0 protocol.
   * POST to the MCP endpoint with:
   *   Authorization: Bearer {token}
   *   Accept: application/json, text/event-stream
   *   Mcp-Session-Id: {session_id} (if established)
   *   Body: {"jsonrpc":"2.0","id":N,"method":"tools/call","params":{"name":"tool_name","arguments":{...}}}
   */
  async callTool(toolCall: McpToolCall): Promise<McpResponse> {
    await this.ensureInitialized();
    this.requestId++;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.getHeaders(),
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

      // If we get a session ID in response, update it
      const mcpSessionId = response.headers.get("mcp-session-id");
      if (mcpSessionId) {
        this.sessionId = mcpSessionId;
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `MCP call failed (${response.status}): ${errorText}`,
        };
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle SSE (text/event-stream) responses
      if (contentType.includes("text/event-stream")) {
        const text = await response.text();
        // Parse SSE format: look for data lines containing JSON-RPC response
        const lines = text.split("\n");
        let jsonRpc: JsonRpcResponse | null = null;

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data) as JsonRpcResponse;
                if (parsed.jsonrpc === "2.0") {
                  jsonRpc = parsed;
                }
              } catch {
                // Not JSON, skip
              }
            }
          }
        }

        if (!jsonRpc) {
          return { success: false, error: "No valid JSON-RPC response in SSE stream" };
        }

        return this.parseJsonRpcResponse(jsonRpc);
      }

      // Handle regular JSON responses
      const jsonRpc = (await response.json()) as JsonRpcResponse;
      return this.parseJsonRpcResponse(jsonRpc);
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
