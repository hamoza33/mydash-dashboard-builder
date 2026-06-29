/**
 * Main reconciliation engine.
 *
 * Ties together phone normalization, schema detection, city mapping,
 * row assembly, and metrics calculation into a complete pipeline.
 */

export { normalizePhone, hasGccPrefix, extractCountryCode, GCC_PREFIXES } from "./phone";
export { detectSchema, detectBatchSchema, extractName, extractPhone, extractAddress } from "./schema-detector";
export { mapCity, getCityMappings } from "./city-mapper";
export { assembleRow, assembleRows, validateRow, COLUMNS, COLUMN_COUNT, COLUMN_HEADERS } from "./row-assembler";
export { calculateMetrics, formatRate, countShipmentStatuses } from "./metrics";
export type { SchemaType } from "./schema-detector";
export type { ShipmentCounts, MetricsResult } from "./metrics";
export type { RowData } from "./row-assembler";

import { assembleRows, COLUMN_HEADERS, type RowData } from "./row-assembler";
import { normalizePhone } from "./phone";
import { calculateMetrics, countShipmentStatuses, type MetricsResult } from "./metrics";

export interface ReconciliationInput {
  codLeads: Record<string, unknown>[];
  codOrders: Record<string, unknown>[];
  lfOrders: Record<string, unknown>[];
  trackingData: Record<string, unknown>[];
  defaultCc: string;
  productName: string;
}

export interface ReconciliationResult {
  headers: string[];
  rows: RowData[];
  metrics: MetricsResult;
  totalRecords: number;
  duplicatesFound: number;
  reconciledCount: number;
}

/**
 * Runs the full reconciliation process on all input data sources.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const { codLeads, codOrders, lfOrders, trackingData, defaultCc } = input;

  // Assemble rows from each source
  const leadRows = assembleRows(codLeads, defaultCc, "cod_leads");
  const orderRows = assembleRows(codOrders, defaultCc, "cod_orders");
  const lfRows = assembleRows(lfOrders, defaultCc, "lightfunnels");

  // Combine all rows
  const allRows = [...leadRows, ...orderRows, ...lfRows];

  // Detect duplicates by normalized phone
  const phoneMap = new Map<string, number[]>();
  let duplicatesFound = 0;

  allRows.forEach((row, index) => {
    const normalizedPhone = row[5]; // Column F: Normalized Phone
    if (normalizedPhone) {
      const existing = phoneMap.get(normalizedPhone) || [];
      existing.push(index);
      phoneMap.set(normalizedPhone, existing);
    }
  });

  // Mark duplicates
  for (const [, indices] of phoneMap) {
    if (indices.length > 1) {
      duplicatesFound += indices.length - 1;
      indices.forEach((idx, i) => {
        if (i > 0) {
          allRows[idx][37] = "yes"; // AL: Duplicate
        }
      });
    }
  }

  // Reconcile with tracking data
  let reconciledCount = 0;
  const trackingByPhone = new Map<string, Record<string, unknown>>();
  const trackingByWaybill = new Map<string, Record<string, unknown>>();

  for (const tracking of trackingData) {
    // Index by phone (normalized)
    const rawPhone = String(tracking.phone || tracking.phone_number || tracking.consignee_phone || "");
    const normalized = normalizePhone(rawPhone, defaultCc);
    if (normalized) {
      trackingByPhone.set(normalized, tracking);
    }
    // Also index by waybill/tracking number for direct matching
    const waybill = String(tracking.waybill || tracking.tracking_number || tracking.awb || "").trim();
    if (waybill) {
      trackingByWaybill.set(waybill, tracking);
    }
  }

  for (const row of allRows) {
    const normalizedPhone = row[5];
    const existingTracking = row[22]; // W: Tracking Number from the order itself

    // Try matching by phone first
    if (normalizedPhone && trackingByPhone.has(normalizedPhone)) {
      const tracking = trackingByPhone.get(normalizedPhone)!;
      row[22] = String(tracking.tracking_number || tracking.waybill || tracking.awb || row[22] || ""); // W
      row[23] = String(tracking.status || tracking.shipping_status || tracking.current_status || ""); // X
      row[24] = String(tracking.shipped_date || tracking.ship_date || ""); // Y
      row[25] = String(tracking.delivered_date || tracking.delivery_date || ""); // Z
      row[38] = "phone"; // AM: Match Type
      row[39] = "yes"; // AN: Reconciled
      reconciledCount++;
    }
    // Try matching by tracking number if we have one in the order
    else if (existingTracking && trackingByWaybill.has(existingTracking)) {
      const tracking = trackingByWaybill.get(existingTracking)!;
      row[23] = String(tracking.status || tracking.shipping_status || tracking.current_status || ""); // X
      row[24] = String(tracking.shipped_date || tracking.ship_date || ""); // Y
      row[25] = String(tracking.delivered_date || tracking.delivery_date || ""); // Z
      row[38] = "waybill"; // AM: Match Type
      row[39] = "yes"; // AN: Reconciled
      reconciledCount++;
    }
  }

  // Calculate metrics from tracking data
  const metrics = calculateMetrics(
    countShipmentStatuses(trackingData, "status")
  );

  return {
    headers: [...COLUMN_HEADERS],
    rows: allRows,
    metrics,
    totalRecords: allRows.length,
    duplicatesFound,
    reconciledCount,
  };
}
