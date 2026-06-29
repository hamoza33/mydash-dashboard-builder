/**
 * Dual schema detection for order data.
 *
 * Schema A: Contains "first_name" key (e.g., COD Network format)
 * Schema B: Contains "name_1" key (e.g., LightFunnels format)
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

  if (keys.includes("name_1")) {
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
    // Schema B uses name_1 (first) and name_2 (last)
    return {
      firstName: String(record.name_1 || ""),
      lastName: String(record.name_2 || ""),
    };
  }

  return { firstName: "", lastName: "" };
}

/**
 * Extracts the phone number field based on detected schema.
 */
export function extractPhone(
  record: Record<string, unknown>,
  schema: SchemaType
): string {
  if (schema === "A") {
    return String(record.phone || record.telephone || "");
  }

  if (schema === "B") {
    return String(record.phone_number || record.phone || "");
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
