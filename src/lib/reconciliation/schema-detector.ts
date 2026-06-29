/**
 * Dual schema detection for order data.
 *
 * Schema A: Contains "first_name" key (e.g., COD Network format with first_name/last_name)
 * Schema B: Contains "full_name" or "name_1" key (e.g., COD Network alt format or LightFunnels)
 *
 * Live data examples:
 *   Schema A: { lead_id, first_name, last_name, phone, original_phone, status, ... }
 *   Schema B: { lead_id, full_name, phone, original_phone, status, extra_fields, ... }
 *   Schema B (LF): { name_1, phone_number, ... }
 */

export type SchemaType = "A" | "B" | "unknown";

/**
 * Detects which schema format a record uses.
 * @param record - A single data record (object with string keys)
 * @returns The detected schema type
 */
export function detectSchema(record: Record<string, unknown>): SchemaType {
  if (!record || typeof record !== "object") {
    return "unknown";
  }

  const keys = Object.keys(record);

  if (keys.includes("first_name")) {
    return "A";
  }

  if (keys.includes("full_name") || keys.includes("name_1")) {
    return "B";
  }

  return "unknown";
}

/**
 * Detects schema from a batch of records using majority vote.
 * @param records - Array of data records
 * @returns The detected schema type based on the first valid record
 */
export function detectBatchSchema(
  records: Record<string, unknown>[]
): SchemaType {
  if (!records || records.length === 0) {
    return "unknown";
  }

  // Use first record to detect schema
  for (const record of records) {
    const schema = detectSchema(record);
    if (schema !== "unknown") {
      return schema;
    }
  }

  return "unknown";
}

/**
 * Extracts the customer name based on detected schema.
 * Schema A: first_name + last_name
 * Schema B: full_name (split on space) or name_1 + name_2
 */
export function extractName(
  record: Record<string, unknown>,
  schema: SchemaType
): { firstName: string; lastName: string } {
  if (schema === "A") {
    return {
      firstName: String(record.first_name || ""),
      lastName: String(record.last_name || ""),
    };
  }

  if (schema === "B") {
    // Schema B may use full_name (COD alt) or name_1/name_2 (LightFunnels)
    if (record.full_name) {
      const fullName = String(record.full_name).trim();
      const spaceIdx = fullName.indexOf(" ");
      if (spaceIdx > 0) {
        return {
          firstName: fullName.slice(0, spaceIdx),
          lastName: fullName.slice(spaceIdx + 1),
        };
      }
      return { firstName: fullName, lastName: "" };
    }
    return {
      firstName: String(record.name_1 || ""),
      lastName: String(record.name_2 || ""),
    };
  }

  return { firstName: "", lastName: "" };
}

/**
 * Extracts the phone number field based on detected schema.
 * COD data may have both "phone" and "original_phone" - prefer original_phone
 * as it contains the unformatted number.
 */
export function extractPhone(
  record: Record<string, unknown>,
  schema: SchemaType
): string {
  if (schema === "A") {
    // Prefer original_phone if available (COD Network data)
    return String(record.original_phone || record.phone || record.telephone || "");
  }

  if (schema === "B") {
    // Schema B: prefer original_phone, then phone_number, then phone
    return String(record.original_phone || record.phone_number || record.phone || "");
  }

  return "";
}

/**
 * Extracts the address fields based on detected schema.
 */
export function extractAddress(
  record: Record<string, unknown>,
  schema: SchemaType
): { city: string; address: string; region: string } {
  if (schema === "A") {
    return {
      city: String(record.city || ""),
      address: String(record.address || record.street || ""),
      region: String(record.region || record.state || ""),
    };
  }

  if (schema === "B") {
    return {
      city: String(record.city_1 || record.city || ""),
      address: String(record.address_1 || record.address || ""),
      region: String(record.region_1 || record.region || ""),
    };
  }

  return { city: "", address: "", region: "" };
}
