/**
 * Metrics calculations for the reconciliation dashboard.
 *
 * - Delivery rate = delivered / shipped
 * - Return rate = returned / shipped
 * - Pending rate = pending / shipped
 */

export interface ShipmentCounts {
  shipped: number;
  delivered: number;
  returned: number;
  pending: number;
}

export interface MetricsResult {
  deliveryRate: number;
  returnRate: number;
  pendingRate: number;
  shipped: number;
  delivered: number;
  returned: number;
  pending: number;
}

/**
 * Calculates delivery, return, and pending rates from shipment counts.
 * All rates are expressed as decimals (0-1). Returns 0 if shipped is 0.
 */
export function calculateMetrics(counts: ShipmentCounts): MetricsResult {
  const { shipped, delivered, returned, pending } = counts;

  if (shipped === 0) {
    return {
      deliveryRate: 0,
      returnRate: 0,
      pendingRate: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
      pending: 0,
    };
  }

  return {
    deliveryRate: delivered / shipped,
    returnRate: returned / shipped,
    pendingRate: pending / shipped,
    shipped,
    delivered,
    returned,
    pending,
  };
}

/**
 * Formats a rate as a percentage string (e.g., "85.5%").
 */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Counts shipment statuses from an array of records.
 * Handles various status formats from different tracking MCPs.
 * @param records - Array of records with a status field
 * @param statusField - The field name containing the shipment status
 */
export function countShipmentStatuses(
  records: Record<string, unknown>[],
  statusField: string = "status"
): ShipmentCounts {
  const counts: ShipmentCounts = {
    shipped: 0,
    delivered: 0,
    returned: 0,
    pending: 0,
  };

  for (const record of records) {
    // Try multiple possible status field names
    const rawStatus = record[statusField] || record.current_status || record.shipping_status || "";
    const status = String(rawStatus).toLowerCase().trim();

    counts.shipped++;

    if (
      status === "delivered" ||
      status === "deliver" ||
      status === "dlv" ||
      status === "signed" ||
      status === "pod" ||
      status.includes("delivered")
    ) {
      counts.delivered++;
    } else if (
      status === "returned" ||
      status === "return" ||
      status === "rtn" ||
      status === "rto" ||
      status === "return_to_origin" ||
      status.includes("returned") ||
      status.includes("return")
    ) {
      counts.returned++;
    } else if (
      status === "pending" ||
      status === "in_transit" ||
      status === "transit" ||
      status === "out_for_delivery" ||
      status === "ofd" ||
      status === "pickup" ||
      status === "picked_up" ||
      status === "dispatched" ||
      status === "shipped" ||
      status === "in transit" ||
      status.includes("transit") ||
      status.includes("pending")
    ) {
      counts.pending++;
    }
  }

  return counts;
}
