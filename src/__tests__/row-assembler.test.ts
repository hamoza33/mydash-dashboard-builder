import {
  assembleRow,
  assembleRows,
  validateRow,
  COLUMN_COUNT,
  COLUMNS,
  COLUMN_HEADERS,
} from "../lib/reconciliation/row-assembler";

describe("assembleRow", () => {
  it("produces exactly 45 columns", () => {
    const record = { first_name: "John", last_name: "Doe", phone: "0555123456" };
    const row = assembleRow(record, "966", "cod_leads");
    expect(row).toHaveLength(45);
  });

  it("correctly populates Schema A record fields", () => {
    const record = {
      order_id: "ORD-001",
      date: "2024-01-15",
      first_name: "John",
      last_name: "Doe",
      phone: "0555123456",
      email: "john@example.com",
      city: "JEDDAH",
      address: "123 Main St",
      region: "Western",
      product_name: "Widget",
      quantity: "2",
      total_price: "100.00",
      currency: "SAR",
    };

    const row = assembleRow(record, "966", "cod_leads");

    expect(row[0]).toBe("ORD-001");          // A: Order ID
    expect(row[1]).toBe("2024-01-15");       // B: Date
    expect(row[2]).toBe("John");             // C: First Name
    expect(row[3]).toBe("Doe");              // D: Last Name
    expect(row[4]).toBe("0555123456");       // E: Phone
    expect(row[5]).toBe("966555123456");     // F: Normalized Phone
    expect(row[6]).toBe("john@example.com"); // G: Email
    expect(row[7]).toBe("966");              // H: Country Code
    expect(row[8]).toBe("Jeddah");           // I: City (mapped)
    expect(row[9]).toBe("123 Main St");      // J: Address
    expect(row[10]).toBe("Western");         // K: Region
    expect(row[12]).toBe("Widget");          // M: Product Name
    expect(row[14]).toBe("2");               // O: Quantity
    expect(row[16]).toBe("100.00");          // Q: Total Price
    expect(row[17]).toBe("SAR");             // R: Currency
    expect(row[30]).toBe("cod_leads");       // AE: Source
    expect(row[43]).toBe("A");               // AR: Schema Type
  });

  it("correctly populates Schema B record fields", () => {
    const record = {
      id: "LF-002",
      created_at: "2024-01-16",
      name_1: "Ahmed",
      name_2: "Ali",
      phone_number: "0501234567",
      email: "ahmed@example.com",
      city_1: "MADEENA",
      address_1: "456 Oak Ave",
      region_1: "Madinah",
    };

    const row = assembleRow(record, "966", "lightfunnels");

    expect(row[0]).toBe("LF-002");           // A: Order ID (fallback to id)
    expect(row[1]).toBe("2024-01-16");       // B: Date
    expect(row[2]).toBe("Ahmed");            // C: First Name
    expect(row[3]).toBe("Ali");              // D: Last Name
    expect(row[4]).toBe("0501234567");       // E: Phone
    expect(row[5]).toBe("966501234567");     // F: Normalized Phone
    expect(row[8]).toBe("Madina");           // I: City (mapped MADEENA -> Madina)
    expect(row[30]).toBe("lightfunnels");    // AE: Source
    expect(row[43]).toBe("B");               // AR: Schema Type
  });

  it("uses default values for missing fields", () => {
    const record = { first_name: "Test" };
    const row = assembleRow(record, "966", "test");

    expect(row[14]).toBe("1");    // O: Quantity defaults to "1"
    expect(row[17]).toBe("SAR");  // R: Currency defaults to "SAR"
    expect(row[18]).toBe("COD");  // S: Payment Method defaults to "COD"
  });
});

describe("assembleRows", () => {
  it("assembles multiple records", () => {
    const records = [
      { first_name: "A", phone: "111" },
      { first_name: "B", phone: "222" },
      { first_name: "C", phone: "333" },
    ];

    const rows = assembleRows(records, "966", "test");
    expect(rows).toHaveLength(3);
    rows.forEach((row) => expect(row).toHaveLength(45));
  });
});

describe("validateRow", () => {
  it("returns true for valid 45-column rows", () => {
    const row = new Array(45).fill("");
    expect(validateRow(row)).toBe(true);
  });

  it("returns false for incorrect column counts", () => {
    expect(validateRow(new Array(44).fill(""))).toBe(false);
    expect(validateRow(new Array(46).fill(""))).toBe(false);
    expect(validateRow([])).toBe(false);
  });
});

describe("constants", () => {
  it("COLUMN_COUNT is 45", () => {
    expect(COLUMN_COUNT).toBe(45);
  });

  it("COLUMNS has 45 entries from A to AS", () => {
    expect(COLUMNS).toHaveLength(45);
    expect(COLUMNS[0]).toBe("A");
    expect(COLUMNS[25]).toBe("Z");
    expect(COLUMNS[26]).toBe("AA");
    expect(COLUMNS[44]).toBe("AS");
  });

  it("COLUMN_HEADERS has 45 entries", () => {
    expect(COLUMN_HEADERS).toHaveLength(45);
  });
});
