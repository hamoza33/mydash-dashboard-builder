import { prisma } from "./db";

/**
 * PromptLoader service that fetches Google Docs via their export URLs,
 * computes content hash, and stores snapshots in the database with version tracking.
 */
export class PromptLoader {
  private static getExportUrl(docId: string): string {
    return `https://docs.google.com/document/d/${docId}/export?format=txt`;
  }

  /**
   * Fetches a Google Doc by its ID and returns the plain text content.
   * Validates that the response is actually plain text (not an HTML login page).
   */
  static async fetchDocContent(docId: string): Promise<string> {
    const url = this.getExportUrl(docId);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Google Doc ${docId}: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      contentType.includes("text/html") ||
      (!contentType.includes("text/plain") && !contentType.includes("application/octet-stream"))
    ) {
      throw new Error(
        `Google Doc ${docId} returned unexpected content-type: ${contentType}. The document may no longer be publicly accessible.`
      );
    }

    const text = await response.text();

    // Additional check: if the content starts with a DOCTYPE, it's likely a login page
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      throw new Error(
        `Google Doc ${docId} returned HTML content instead of plain text. The document may no longer be publicly accessible.`
      );
    }

    return text;
  }

  /**
   * Computes a hash of the content for change detection.
   */
  static async computeHash(content: string): Promise<string> {
    const { sha256 } = await import("crypto-hash");
    return sha256(content);
  }

  /**
   * Loads a prompt from Google Docs, checks if content has changed,
   * and stores/updates the snapshot in the database.
   */
  static async loadPrompt(
    docId: string,
    type: "RECONCILIATION" | "DASHBOARD"
  ): Promise<{
    content: string;
    version: number;
    isNew: boolean;
  }> {
    const content = await this.fetchDocContent(docId);
    const contentHash = await this.computeHash(content);
    const docUrl = this.getExportUrl(docId);

    // Check if we already have this prompt stored
    const existing = await prisma.promptConfig.findFirst({
      where: { docUrl, type },
      orderBy: { promptVersion: "desc" },
    });

    if (existing && existing.contentHash === contentHash) {
      // Content hasn't changed
      return {
        content: existing.content,
        version: existing.promptVersion,
        isNew: false,
      };
    }

    // Content is new or has changed - create a new version
    const newVersion = existing ? existing.promptVersion + 1 : 1;

    await prisma.promptConfig.create({
      data: {
        docUrl,
        docTitle: `${type} Prompt v${newVersion}`,
        contentHash,
        promptVersion: newVersion,
        content,
        type,
      },
    });

    return {
      content,
      version: newVersion,
      isNew: true,
    };
  }

  /**
   * Gets the latest stored prompt content without fetching from Google Docs.
   */
  static async getLatestPrompt(
    type: "RECONCILIATION" | "DASHBOARD"
  ): Promise<string | null> {
    const prompt = await prisma.promptConfig.findFirst({
      where: { type },
      orderBy: { promptVersion: "desc" },
    });

    return prompt?.content ?? null;
  }
}
