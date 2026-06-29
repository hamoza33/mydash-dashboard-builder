import { normalizePhone, hasGccPrefix, extractCountryCode, GCC_PREFIXES } from "../lib/reconciliation/phone";

describe("normalizePhone", () => {
  it("returns empty string for empty input", () => {
    expect(normalizePhone("", "966")).toBe("");
    expect(normalizePhone("   ", "966")).toBe("");
  });

  it("strips all non-digit characters", () => {
    expect(normalizePhone("+966-555-1234-56", "966")).toBe("966555123456");
    expect(normalizePhone("(966) 555 1234", "966")).toBe("9665551234");
    expect(normalizePhone("966.555.1234", "966")).toBe("9665551234");
  });

  it("strips unicode whitespace and formatting", () => {
    expect(normalizePhone("966\u00A0555\u20001234", "966")).toBe("9665551234");
    expect(normalizePhone("\u202D966555123456\u202C", "966")).toBe("966555123456");
  });

  it("strips leading 00 international prefix", () => {
    expect(normalizePhone("00966555123456", "966")).toBe("966555123456");
    expect(normalizePhone("00971501234567", "966")).toBe("971501234567");
  });

  it("removes leading 0 and prepends default country code", () => {
    expect(normalizePhone("0555123456", "966")).toBe("966555123456");
    expect(normalizePhone("0501234567", "971")).toBe("971501234567");
  });

  it("prepends default country code to 9-digit numbers", () => {
    expect(normalizePhone("555123456", "966")).toBe("966555123456");
    expect(normalizePhone("501234567", "971")).toBe("971501234567");
  });

  it("does not modify numbers that already have country code", () => {
    expect(normalizePhone("966555123456", "966")).toBe("966555123456");
    expect(normalizePhone("971501234567", "971")).toBe("971501234567");
  });

  it("handles combined scenarios", () => {
    // 00 prefix + formatting
    expect(normalizePhone("+00966-555-123456", "966")).toBe("966555123456");
    // Leading 0 with spaces
    expect(normalizePhone("0 555 123 456", "966")).toBe("966555123456");
  });
});

describe("hasGccPrefix", () => {
  it("returns true for valid GCC prefixes", () => {
    expect(hasGccPrefix("966555123456")).toBe(true);
    expect(hasGccPrefix("971501234567")).toBe(true);
    expect(hasGccPrefix("965123456789")).toBe(true);
    expect(hasGccPrefix("974123456789")).toBe(true);
    expect(hasGccPrefix("968123456789")).toBe(true);
    expect(hasGccPrefix("973123456789")).toBe(true);
  });

  it("returns false for non-GCC prefixes", () => {
    expect(hasGccPrefix("1234567890")).toBe(false);
    expect(hasGccPrefix("44123456789")).toBe(false);
    expect(hasGccPrefix("20123456789")).toBe(false);
  });
});

describe("extractCountryCode", () => {
  it("extracts GCC country codes", () => {
    expect(extractCountryCode("966555123456")).toBe("966");
    expect(extractCountryCode("971501234567")).toBe("971");
    expect(extractCountryCode("965123456789")).toBe("965");
  });

  it("returns null for non-GCC numbers", () => {
    expect(extractCountryCode("1234567890")).toBeNull();
    expect(extractCountryCode("44123456789")).toBeNull();
  });
});

describe("GCC_PREFIXES", () => {
  it("contains all 6 GCC country codes", () => {
    expect(GCC_PREFIXES).toHaveLength(6);
    expect(GCC_PREFIXES).toContain("966");
    expect(GCC_PREFIXES).toContain("971");
    expect(GCC_PREFIXES).toContain("965");
    expect(GCC_PREFIXES).toContain("974");
    expect(GCC_PREFIXES).toContain("968");
    expect(GCC_PREFIXES).toContain("973");
  });
});
