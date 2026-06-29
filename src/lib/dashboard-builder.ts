/**
 * Dashboard HTML builder.
 *
 * Generates a standalone HTML dashboard with embedded styling,
 * city performance charts, key metrics, and live data fetching support.
 * Must be under 60KB.
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

export interface CityPerformanceEntry {
  city: string;
  total: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  returned: number;
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
  cityPerformance?: CityPerformanceEntry[];
}

/**
 * Builds a complete standalone HTML dashboard page.
 * Includes key metrics, city performance table, and live data fetching.
 * Self-contained with inline CSS/JS, under 60KB.
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
    cityPerformance = [],
  } = config;

  const safeSheetUrl = sheetUrl ? sanitizeUrl(sheetUrl) : null;

  // Build city rows HTML
  const cityRowsHtml = cityPerformance
    .map((c) => {
      const deliveryRate = c.shipped > 0 ? ((c.delivered / c.shipped) * 100).toFixed(1) : "0.0";
      const returnRate = c.shipped > 0 ? ((c.returned / c.shipped) * 100).toFixed(1) : "0.0";
      return `<tr>
        <td>${escapeHtml(c.city)}</td>
        <td>${c.total}</td>
        <td>${c.confirmed}</td>
        <td>${c.shipped}</td>
        <td>${c.delivered}</td>
        <td>${c.returned}</td>
        <td>${deliveryRate}%</td>
        <td>${returnRate}%</td>
      </tr>`;
    })
    .join("\n");

  // Build city chart bars (horizontal bar chart using CSS)
  const maxCityTotal = cityPerformance.length > 0 ? cityPerformance[0].total : 1;
  const cityBarsHtml = cityPerformance
    .slice(0, 10)
    .map((c) => {
      const pct = Math.round((c.total / maxCityTotal) * 100);
      return `<div class="bar-row">
        <span class="bar-label">${escapeHtml(c.city)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-value">${c.total}</span>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(productName)} - Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#f8fafc;line-height:1.5;min-height:100vh;padding:24px}
.container{max-width:1200px;margin:0 auto}
.header{text-align:center;margin-bottom:32px}
.header h1{font-size:1.75rem;font-weight:700;margin-bottom:4px}
.header .sub{color:#94a3b8;font-size:.9rem}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
.m-card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center}
.m-card .val{font-size:1.75rem;font-weight:700;font-family:'JetBrains Mono',monospace}
.m-card .lbl{color:#94a3b8;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.section{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:16px}
.section h2{font-size:1.1rem;font-weight:600;margin-bottom:12px}
.stat-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155}
.stat-row:last-child{border-bottom:none}
.stat-row .sl{color:#94a3b8}
.stat-row .sv{font-weight:600;font-family:'JetBrains Mono',monospace}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #334155}
th{color:#94a3b8;font-weight:500;text-transform:uppercase;font-size:.7rem;letter-spacing:.04em}
td{color:#f8fafc}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bar-label{width:90px;font-size:.8rem;color:#94a3b8;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:20px;background:#334155;border-radius:4px;overflow:hidden}
.bar-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:4px;transition:width .3s}
.bar-value{width:40px;font-size:.8rem;font-family:monospace;color:#94a3b8}
.footer{text-align:center;margin-top:32px;color:#64748b;font-size:.8rem}
.btn{display:inline-block;margin-top:10px;padding:8px 16px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;font-size:.85rem}
.btn:hover{background:#2563eb}
.c-green{color:#10b981}.c-red{color:#ef4444}.c-yellow{color:#f59e0b}.c-blue{color:#3b82f6}.c-purple{color:#a78bfa}
#live-status{text-align:center;color:#94a3b8;font-size:.8rem;margin-bottom:12px;display:none}
.filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.filters input{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:6px 10px;color:#f8fafc;font-size:.8rem}
@media(max-width:768px){body{padding:12px}.metrics{grid-template-columns:repeat(2,1fr)}.header h1{font-size:1.3rem}.bar-label{width:60px}}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>${escapeHtml(productName)}</h1>
<p class="sub">Reconciliation Dashboard | ${escapeHtml(dateFrom)} to ${escapeHtml(dateTo)}</p>
</div>

<div id="live-status"></div>

<div class="metrics" id="metrics-grid">
<div class="m-card"><div class="val c-blue" id="m-total">${totalOrders}</div><div class="lbl">Total Leads</div></div>
<div class="m-card"><div class="val c-green" id="m-confirmed">${metrics.shipped > 0 ? metrics.delivered + metrics.returned + (metrics.pending || 0) : reconciledCount}</div><div class="lbl">Confirmed</div></div>
<div class="m-card"><div class="val c-purple" id="m-shipped">${metrics.shipped}</div><div class="lbl">Shipped</div></div>
<div class="m-card"><div class="val c-green" id="m-delivered">${metrics.delivered}</div><div class="lbl">Delivered</div></div>
<div class="m-card"><div class="val c-red" id="m-returned">${metrics.returned}</div><div class="lbl">Returned</div></div>
<div class="m-card"><div class="val c-green" id="m-delrate">${formatRate(metrics.deliveryRate)}</div><div class="lbl">Delivery Rate</div></div>
<div class="m-card"><div class="val c-red" id="m-retrate">${formatRate(metrics.returnRate)}</div><div class="lbl">Return Rate</div></div>
</div>

<div class="section">
<h2>Reconciliation Summary</h2>
<div class="stat-row"><span class="sl">Total Records</span><span class="sv" id="s-total">${totalOrders}</span></div>
<div class="stat-row"><span class="sl">Reconciled</span><span class="sv" id="s-reconciled">${reconciledCount}</span></div>
<div class="stat-row"><span class="sl">Duplicates Found</span><span class="sv" id="s-dupes">${duplicatesFound}</span></div>
<div class="stat-row"><span class="sl">Match Rate</span><span class="sv">${formatRate(totalOrders > 0 ? reconciledCount / totalOrders : 0)}</span></div>
</div>

${cityPerformance.length > 0 ? `
<div class="section">
<h2>Top Cities (Orders)</h2>
${cityBarsHtml}
</div>

<div class="section">
<h2>City Performance</h2>
<div class="filters"><input type="text" id="city-filter" placeholder="Filter cities..." oninput="filterCities(this.value)"></div>
<div style="overflow-x:auto">
<table id="city-table">
<thead><tr><th>City</th><th>Total</th><th>Confirmed</th><th>Shipped</th><th>Delivered</th><th>Returned</th><th>Del.Rate</th><th>Ret.Rate</th></tr></thead>
<tbody id="city-tbody">
${cityRowsHtml}
</tbody>
</table>
</div>
</div>
` : ""}

${safeSheetUrl ? `
<div class="section" style="text-align:center">
<h2>Data Sheet</h2>
<p style="color:#94a3b8">View the full reconciliation spreadsheet</p>
<a href="${escapeHtml(safeSheetUrl)}" target="_blank" class="btn">Open Sheet</a>
</div>
` : ""}

<div class="footer">
<p>Generated ${new Date().toISOString().split("T")[0]} | MyDash Dashboard Builder</p>
</div>
</div>

<script>
(function(){
  // City filter functionality
  window.filterCities = function(query) {
    var rows = document.querySelectorAll('#city-tbody tr');
    var q = query.toLowerCase();
    rows.forEach(function(row) {
      var city = row.cells[0].textContent.toLowerCase();
      row.style.display = city.includes(q) ? '' : 'none';
    });
  };

  // Live data fetching via window.DASHBOARD_DATA_API
  if (window.DASHBOARD_DATA_API) {
    var statusEl = document.getElementById('live-status');
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Loading live data...'; }

    fetch(window.DASHBOARD_DATA_API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (statusEl) { statusEl.textContent = 'Live data loaded at ' + new Date().toLocaleTimeString(); }
        // Update metrics if live data provides them
        if (data && data.metrics) {
          var m = data.metrics;
          var el;
          el = document.getElementById('m-total'); if (el && m.totalOrders != null) el.textContent = m.totalOrders;
          el = document.getElementById('m-shipped'); if (el && m.shipped != null) el.textContent = m.shipped;
          el = document.getElementById('m-delivered'); if (el && m.delivered != null) el.textContent = m.delivered;
          el = document.getElementById('m-returned'); if (el && m.returned != null) el.textContent = m.returned;
          if (m.deliveryRate != null) {
            el = document.getElementById('m-delrate'); if (el) el.textContent = (m.deliveryRate * 100).toFixed(1) + '%';
          }
          if (m.returnRate != null) {
            el = document.getElementById('m-retrate'); if (el) el.textContent = (m.returnRate * 100).toFixed(1) + '%';
          }
        }
      })
      .catch(function(err) {
        if (statusEl) { statusEl.textContent = 'Live data unavailable'; }
        console.warn('Dashboard live data fetch failed:', err);
      });
  }
})();
</script>
</body>
</html>`;
}
