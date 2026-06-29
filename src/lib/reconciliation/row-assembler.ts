/**
 * Row assembler for the reconciliation sheet.
 *
 * Produces exactly 45 columns (A through AS) for each order row.
 * Column layout follows the reconciliation prompt specification.
 */

import { normalizePhone } from "./phone";
import { detectSchema, extractName, extractPhone, extractAddress } from "./schema-detector";
import { mapCity } from "./city-mapper";

/**
 * Column definitions A through AS (45 columns total).
 */
export const COLUMNS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD",
  "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN",
  "AO", "AP", "AQ", "AR", "AS",
] as const;

export const COLUMN_COUNT = 45;

/**
 * Column header names for the 45-column sheet.
 */
export const COLUMN_HEADERS = [
  "Order ID",           // A
  "Date",               // B
  "First Name",         // C
  "Last Name",          // D
  "Phone",              // E
  "Normalized Phone",   // F
  "Email",              // G
  "Country Code",       // H
  "City",               // I
  "Address",            // J
  "Region",             // K
  "Postal Code",        // L
  "Product Name",       // M
  "SKU",                // N
  "Quantity",           // O
  "Unit Price",         // P
  "Total Price",        // Q
  "Currency",           // R
  "Payment Method",     // S
  "Payment Status",     // T
  "Order Status",       // U
  "Shipping Method",    // V
  "Tracking Number",    // W
  "Shipping Status",    // X
  "Shipped Date",       // Y
  "Delivered Date",     // Z
  "Return Date",        // AA
  "Return Reason",      // AB
  "COD Amount",         // AC
  "COD Collected",      // AD
  "Source",             // AE
  "Campaign",           // AF
  "Ad Set",             // AG
  "Ad Name",            // AH
  "Platform",           // AI
  "LF Order ID",        // AJ
  "LF Status",          // AK
  "Duplicate",          // AL
  "Match Type",         // AM
  "Reconciled",         // AN
  "Notes",              // AO
  "Created At",         // AP
  "Updated At",         // AQ
  "Schema Type",        // AR
  "Row Hash",           // AS
] as const;

export type RowData = string[];

/**
 * Assembles a single row from order data into the 45-column format.
 * @param record - The raw order record
 * @param defaultCc - Default country code for phone normalization
 * @param source - The data source identifier (e.g., "cod_leads", "cod_orders", "lightfunnels")
 * @returns Array of exactly 45 string values
 */
export function assembleRow(
  record: Record<string, unknown>,
  defaultCc: string,
  source: string
): RowData {
  const schema = detectSchema(record);
  const { firstName, lastName } = extractName(record, schema);
  const rawPhone = extractPhone(record, schema);
  const normalizedPhone = normalizePhone(rawPhone, defaultCc);
  const { city, address, region } = extractAddress(record, schema);
  const mappedCity = mapCity(city);

  const row: RowData = new Array(COLUMN_COUNT).fill("");

  // A: Order ID - use lead_id for COD data, order_id for others
  row[0] = String(record.lead_id || record.order_id || record.id || "");
  // B: Date - use created_at which is the common field across all sources
  row[1] = String(record.created_at || record.date || record.order_date || "");
  row[2] = firstName;                                                      // C: First Name
  row[3] = lastName;                                                       // D: Last Name
  row[4] = rawPhone;                                                       // E: Phone
  row[5] = normalizedPhone;                                                // F: Normalized Phone
  row[6] = String(record.email || "");                                     // G: Email
  // H: Country Code - use country field from COD data or defaultCc
  row[7] = String(record.country || defaultCc);
  row[8] = mappedCity;                                                     // I: City
  row[9] = address;                                                        // J: Address
  row[10] = region;                                                        // K: Region
  row[11] = String(record.postal_code || record.zip || "");               // L: Postal Code
  row[12] = String(record.product_name || record.product || "");          // M: Product Name
  // N: SKU - COD data uses sku_1 field
  row[13] = String(record.sku_1 || record.sku || "");
  // O: Quantity - COD data uses total_quantity
  row[14] = String(record.total_quantity || record.quantity || record.qty || "1");
  row[15] = String(record.unit_price || record.price || "");              // P: Unit Price
  // Q: Total Price - common field across COD data
  row[16] = String(record.total_price || record.total || "");
  // R: Currency - COD data includes currency field
  row[17] = String(record.currency || "SAR");
  row[18] = String(record.payment_method || "COD");                        // S: Payment Method
  row[19] = String(record.payment_status || "");                           // T: Payment Status
  // U: Order Status - COD data uses "status" field (Confirmed, Expired, etc.)
  row[20] = String(record.status || record.order_status || "");
  row[21] = String(record.shipping_method || "");                          // V: Shipping Method
  row[22] = String(record.tracking_number || record.tracking || "");      // W: Tracking Number
  row[23] = String(record.shipping_status || "");                          // X: Shipping Status
  row[24] = String(record.shipped_date || "");                             // Y: Shipped Date
  row[25] = String(record.delivered_date || "");                           // Z: Delivered Date
  row[26] = String(record.return_date || "");                              // AA: Return Date
  row[27] = String(record.return_reason || "");                            // AB: Return Reason
  row[28] = String(record.cod_amount || record.total_price || record.total || ""); // AC: COD Amount
  row[29] = String(record.cod_collected || "");                            // AD: COD Collected
  row[30] = source;                                                        // AE: Source
  row[31] = String(record.campaign || "");                                 // AF: Campaign
  row[32] = String(record.ad_set || record.adset || "");                  // AG: Ad Set
  row[33] = String(record.ad_name || "");                                  // AH: Ad Name
  row[34] = String(record.platform || "");                                 // AI: Platform
  row[35] = String(record.lf_order_id || "");                              // AJ: LF Order ID
  row[36] = String(record.lf_status || "");                                // AK: LF Status
  row[37] = "";                                                            // AL: Duplicate (set during reconciliation)
  row[38] = "";                                                            // AM: Match Type (set during reconciliation)
  row[39] = "";                                                            // AN: Reconciled (set during reconciliation)
  row[40] = String(record.notes || "");                                    // AO: Notes
  row[41] = String(record.created_at || "");                               // AP: Created At
  row[42] = String(record.updated_at || "");                               // AQ: Updated At
  row[43] = schema;                                                        // AR: Schema Type
  row[44] = "";                                                            // AS: Row Hash (computed later)

  return row;
}

/**
 * Assembles multiple records into rows.
 */
export function assembleRows(
  records: Record<string, unknown>[],
  defaultCc: string,
  source: string
): RowData[] {
  return records.map((record) => assembleRow(record, defaultCc, source));
}

/**
 * Validates that a row has exactly 45 columns.
 */
export function validateRow(row: RowData): boolean {
  return row.length === COLUMN_COUNT;
}
