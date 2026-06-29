/**
 * Dashboard HTML builder.
 *
 * Generates a standalone HTML dashboard with embedded styling
 * using design tokens from the specification.
 */

import type { MetricsResult } from "./reconciliation/metrics";
import { formatRate } from "./reconciliation/metrics";

/**
 * Escapes a string for safe insertion into HTML content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates that a URL is a safe HTTPS URL for use in href attributes.
 * Returns the URL if valid, or null if potentially malicious.
 */
function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export interface DashboardConfig {
  productName: string;
  dateFrom: string;
  dateTo: string;
  metrics: MetricsResult;
  totalOrders: number;
  reconciledCount: number;
  duplicatesFound: number;
  sheetUrl?: string;
}

/**
 * Design tokens for the dashboard theme.
 */
const DESIGN_TOKENS = {
  colors: {
    background: "#0f172a",
    surface: "#1e293b",
    surfaceHover: "#334155",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    border: "#334155",
    cardBg: "#1e293b",
  },
  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
};

/**
 * Generates a metric card HTML block.
 */
function metricCard(label: string, value: string, color: string): string {
  return `
    <div class="metric-card">
      <div class="metric-value" style="color: ${color};">${value}</div>
      <div class="metric-label">${label}</div>
    </div>
  `;
}

/**
 * Generates a stat row for the summary section.
 */
function statRow(label: string, value: string | number): string {
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>
  `;
}

/**
 * Builds a complete standalone HTML dashboard page.
 */
export function buildDashboardHtml(config: DashboardConfig): string {
  const {
    productName,
    dateFrom,
    dateTo,
    metrics,
    totalOrders,
    reconciledCount,
    duplicatesFound,
    sheetUrl,
  } = config;

  const t = DESIGN_TOKENS;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(productName)} Dashboard - ${escapeHtml(dateFrom)} to ${escapeHtml(dateTo)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${t.fonts.sans};
      background-color: ${t.colors.background};
      color: ${t.colors.textPrimary};
      line-height: 1.6;
      min-height: 100vh;
      padding: ${t.spacing.xl};
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: ${t.spacing.xxl};
      text-align: center;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: ${t.spacing.sm};
    }

    .header .subtitle {
      color: ${t.colors.textSecondary};
      font-size: 1rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: ${t.spacing.md};
      margin-bottom: ${t.spacing.xxl};
    }

    .metric-card {
      background: ${t.colors.cardBg};
      border: 1px solid ${t.colors.border};
      border-radius: ${t.borderRadius.lg};
      padding: ${t.spacing.lg};
      text-align: center;
      transition: background-color 0.2s;
    }

    .metric-card:hover {
      background: ${t.colors.surfaceHover};
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      font-family: ${t.fonts.mono};
      margin-bottom: ${t.spacing.xs};
    }

    .metric-label {
      color: ${t.colors.textSecondary};
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .section {
      background: ${t.colors.cardBg};
      border: 1px solid ${t.colors.border};
      border-radius: ${t.borderRadius.lg};
      padding: ${t.spacing.lg};
      margin-bottom: ${t.spacing.lg};
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: ${t.spacing.md};
      color: ${t.colors.textPrimary};
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${t.spacing.sm} 0;
      border-bottom: 1px solid ${t.colors.border};
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: ${t.colors.textSecondary};
    }

    .stat-value {
      font-weight: 600;
      font-family: ${t.fonts.mono};
    }

    .footer {
      text-align: center;
      margin-top: ${t.spacing.xxl};
      color: ${t.colors.textMuted};
      font-size: 0.875rem;
    }

    .sheet-link {
      display: inline-block;
      margin-top: ${t.spacing.md};
      padding: ${t.spacing.sm} ${t.spacing.md};
      background: ${t.colors.primary};
      color: ${t.colors.textPrimary};
      border-radius: ${t.borderRadius.md};
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .sheet-link:hover {
      background: ${t.colors.primaryHover};
    }

    @media (max-width: 768px) {
      body { padding: ${t.spacing.md}; }
      .header h1 { font-size: 1.5rem; }
      .metric-value { font-size: 1.5rem; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(productName)} - Reconciliation Dashboard</h1>
      <p class="subtitle">Period: ${escapeHtml(dateFrom)} to ${escapeHtml(dateTo)}</p>
    </div>

    <div class="metrics-grid">
      ${metricCard("Delivery Rate", formatRate(metrics.deliveryRate), t.colors.success)}
      ${metricCard("Return Rate", formatRate(metrics.returnRate), t.colors.error)}
      ${metricCard("Pending Rate", formatRate(metrics.pendingRate), t.colors.warning)}
      ${metricCard("Total Orders", String(totalOrders), t.colors.primary)}
    </div>

    <div class="section">
      <h2>Shipment Summary</h2>
      ${statRow("Total Shipped", metrics.shipped)}
      ${statRow("Delivered", metrics.delivered)}
      ${statRow("Returned", metrics.returned)}
      ${statRow("Pending", metrics.pending)}
    </div>

    <div class="section">
      <h2>Reconciliation Summary</h2>
      ${statRow("Total Records", totalOrders)}
      ${statRow("Reconciled", reconciledCount)}
      ${statRow("Duplicates Found", duplicatesFound)}
      ${statRow("Match Rate", formatRate(totalOrders > 0 ? reconciledCount / totalOrders : 0))}
    </div>

    ${sheetUrl ? (() => {
      const safeUrl = sanitizeUrl(sheetUrl);
      if (!safeUrl) return "";
      return `
    <div class="section" style="text-align: center;">
      <h2>Data Sheet</h2>
      <p style="color: ${t.colors.textSecondary};">View the full reconciliation spreadsheet</p>
      <a href="${escapeHtml(safeUrl)}" target="_blank" class="sheet-link">Open Sheet</a>
    </div>
    `;
    })() : ""}

    <div class="footer">
      <p>Generated on ${new Date().toISOString().split("T")[0]} | MyDash Dashboard Builder</p>
    </div>
  </div>
</body>
</html>`;
}
