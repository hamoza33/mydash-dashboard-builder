import {
  detectSchema,
  detectBatchSchema,
  extractName,
  extractPhone,
  extractAddress,
} from "../lib/reconciliation/schema-detector";

describe("detectSchema", () => {
  it("detects Schema A when first_name key is present", () => {
    expect(detectSchema({ first_name: "John", last_name: "Doe" })).toBe("A");
  });

  it("detects Schema B when name_1 key is present", () => {
    expect(detectSchema({ name_1: "Ahmed", name_2: "Ali" })).toBe("B");
  });

  it("returns unknown for records without identifiable keys", () => {
    expect(detectSchema({ name: "John", phone: "123" })).toBe("unknown");
  });

  it("returns unknown for null/undefined input", () => {
    expect(detectSchema(null as unknown as Record<string, unknown>)).toBe("unknown");
    expect(detectSchema(undefined as unknown as Record<string, unknown>)).toBe("unknown");
  });

  it("prefers Schema A if both keys are present", () => {
    expect(detectSchema({ first_name: "John", name_1: "Ahmed" })).toBe("A");
  });
});

describe("detectBatchSchema", () => {
  it("detects schema from first valid record", () => {
    const records = [
      { first_name: "John", last_name: "Doe" },
      { first_name: "Jane", last_name: "Smith" },
    ];
    expect(detectBatchSchema(records)).toBe("A");
  });

  it("skips unknown records to find schema", () => {
    const records = [
      { unrelated: "data" },
      { name_1: "Ahmed", name_2: "Ali" },
    ];
    expect(detectBatchSchema(records)).toBe("B");
  });

  it("returns unknown for empty arrays", () => {
    expect(detectBatchSchema([])).toBe("unknown");
  });
});

describe("extractName", () => {
  it("extracts name from Schema A records", () => {
    const record = { first_name: "John", last_name: "Doe" };
    expect(extractName(record, "A")).toEqual({
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("extracts name from Schema B records", () => {
    const record = { name_1: "Ahmed", name_2: "Ali" };
    expect(extractName(record, "B")).toEqual({
      firstName: "Ahmed",
      lastName: "Ali",
    });
  });

  it("returns empty strings for unknown schema", () => {
    expect(extractName({}, "unknown")).toEqual({
      firstName: "",
      lastName: "",
    });
  });
});

describe("extractPhone", () => {
  it("extracts phone from Schema A records", () => {
    expect(extractPhone({ phone: "0555123456" }, "A")).toBe("0555123456");
    expect(extractPhone({ telephone: "0555123456" }, "A")).toBe("0555123456");
  });

  it("extracts phone from Schema B records", () => {
    expect(extractPhone({ phone_number: "0555123456" }, "B")).toBe("0555123456");
    expect(extractPhone({ phone: "0555123456" }, "B")).toBe("0555123456");
  });

  it("returns empty string for unknown schema", () => {
    expect(extractPhone({ phone: "123" }, "unknown")).toBe("");
  });
});

describe("extractAddress", () => {
  it("extracts address from Schema A records", () => {
    const record = { city: "JEDDAH", address: "123 Main St", region: "Western" };
    expect(extractAddress(record, "A")).toEqual({
      city: "JEDDAH",
      address: "123 Main St",
      region: "Western",
    });
  });

  it("extracts address from Schema B records", () => {
    const record = { city_1: "MAKKAH", address_1: "456 Oak Ave", region_1: "Holy" };
    expect(extractAddress(record, "B")).toEqual({
      city: "MAKKAH",
      address: "456 Oak Ave",
      region: "Holy",
    });
  });

  it("falls back to common field names in Schema B", () => {
    const record = { city: "MADEENA", address: "789 Elm", region: "North" };
    expect(extractAddress(record, "B")).toEqual({
      city: "MADEENA",
      address: "789 Elm",
      region: "North",
    });
  });
});
