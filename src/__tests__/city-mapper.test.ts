import { mapCity, getCityMappings } from "../lib/reconciliation/city-mapper";

describe("mapCity", () => {
  it("maps MADEENA to Madina", () => {
    expect(mapCity("MADEENA")).toBe("Madina");
  });

  it("maps MAKKAH to Makkah", () => {
    expect(mapCity("MAKKAH")).toBe("Makkah");
  });

  it("maps JEDDAH to Jeddah", () => {
    expect(mapCity("JEDDAH")).toBe("Jeddah");
  });

  it("maps GIZAN to Jazan", () => {
    expect(mapCity("GIZAN")).toBe("Jazan");
  });

  it("maps HOUFUF to Hofuf", () => {
    expect(mapCity("HOUFUF")).toBe("Hofuf");
  });

  it("maps SYSTEM to empty string", () => {
    expect(mapCity("SYSTEM")).toBe("");
  });

  it("is case-insensitive", () => {
    expect(mapCity("madeena")).toBe("Madina");
    expect(mapCity("Makkah")).toBe("Makkah");
    expect(mapCity("jeddah")).toBe("Jeddah");
    expect(mapCity("gizan")).toBe("Jazan");
    expect(mapCity("Houfuf")).toBe("Hofuf");
    expect(mapCity("system")).toBe("");
  });

  it("trims whitespace", () => {
    expect(mapCity("  MADEENA  ")).toBe("Madina");
    expect(mapCity(" JEDDAH")).toBe("Jeddah");
  });

  it("returns original value for unknown cities", () => {
    expect(mapCity("Riyadh")).toBe("Riyadh");
    expect(mapCity("Dubai")).toBe("Dubai");
    expect(mapCity("Dammam")).toBe("Dammam");
  });

  it("returns empty string for empty input", () => {
    expect(mapCity("")).toBe("");
    expect(mapCity("   ")).toBe("");
  });
});

describe("getCityMappings", () => {
  it("returns all known city mappings", () => {
    const mappings = getCityMappings();
    expect(mappings).toHaveProperty("MADEENA", "Madina");
    expect(mappings).toHaveProperty("MAKKAH", "Makkah");
    expect(mappings).toHaveProperty("JEDDAH", "Jeddah");
    expect(mappings).toHaveProperty("GIZAN", "Jazan");
    expect(mappings).toHaveProperty("HOUFUF", "Hofuf");
    expect(mappings).toHaveProperty("SYSTEM", "");
  });

  it("returns a copy (not a reference to the internal map)", () => {
    const mappings = getCityMappings();
    mappings["NEW_CITY"] = "New";
    expect(getCityMappings()).not.toHaveProperty("NEW_CITY");
  });
});
