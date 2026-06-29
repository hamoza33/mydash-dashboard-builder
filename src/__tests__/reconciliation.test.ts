import { reconcile, type ReconciliationInput } from "../lib/reconciliation";

describe("reconcile", () => {
  const baseInput: ReconciliationInput = {
    codLeads: [],
    codOrders: [],
    lfOrders: [],
    trackingData: [],
    defaultCc: "966",
    productName: "Test Product",
  };

  it("returns empty result for empty input", () => {
    const result = reconcile(baseInput);

    expect(result.totalRecords).toBe(0);
    expect(result.rows).toHaveLength(0);
    expect(result.duplicatesFound).toBe(0);
    expect(result.reconciledCount).toBe(0);
    expect(result.headers).toHaveLength(45);
  });

  it("assembles rows from all sources", () => {
    const input: ReconciliationInput = {
      ...baseInput,
      codLeads: [{ first_name: "A", phone: "0555111111" }],
      codOrders: [{ first_name: "B", phone: "0555222222" }],
      lfOrders: [{ name_1: "C", phone_number: "0555333333" }],
    };

    const result = reconcile(input);

    expect(result.totalRecords).toBe(3);
    expect(result.rows).toHaveLength(3);
    // Check sources
    expect(result.rows[0][30]).toBe("cod_leads");
    expect(result.rows[1][30]).toBe("cod_orders");
    expect(result.rows[2][30]).toBe("lightfunnels");
  });

  it("detects duplicates by normalized phone", () => {
    const input: ReconciliationInput = {
      ...baseInput,
      codLeads: [
        { first_name: "A", phone: "0555111111" },
        { first_name: "B", phone: "0555111111" }, // Same phone
      ],
      codOrders: [{ first_name: "C", phone: "0555222222" }],
    };

    const result = reconcile(input);

    expect(result.duplicatesFound).toBe(1);
    expect(result.rows[0][37]).toBe(""); // First occurrence not marked
    expect(result.rows[1][37]).toBe("yes"); // Duplicate marked
  });

  it("reconciles with tracking data by phone match", () => {
    const input: ReconciliationInput = {
      ...baseInput,
      codLeads: [{ first_name: "A", phone: "0555111111" }],
      trackingData: [
        {
          phone: "966555111111",
          tracking_number: "TRK001",
          status: "delivered",
          shipped_date: "2024-01-10",
          delivered_date: "2024-01-15",
        },
      ],
    };

    const result = reconcile(input);

    expect(result.reconciledCount).toBe(1);
    expect(result.rows[0][22]).toBe("TRK001");     // W: Tracking Number
    expect(result.rows[0][23]).toBe("delivered");   // X: Shipping Status
    expect(result.rows[0][24]).toBe("2024-01-10");  // Y: Shipped Date
    expect(result.rows[0][25]).toBe("2024-01-15");  // Z: Delivered Date
    expect(result.rows[0][38]).toBe("phone");       // AM: Match Type
    expect(result.rows[0][39]).toBe("yes");         // AN: Reconciled
  });

  it("calculates metrics from tracking data", () => {
    const input: ReconciliationInput = {
      ...baseInput,
      codLeads: [
        { first_name: "A", phone: "111" },
        { first_name: "B", phone: "222" },
        { first_name: "C", phone: "333" },
        { first_name: "D", phone: "444" },
      ],
      trackingData: [
        { phone: "111", status: "delivered" },
        { phone: "222", status: "delivered" },
        { phone: "333", status: "returned" },
        { phone: "444", status: "pending" },
      ],
    };

    const result = reconcile(input);

    expect(result.metrics.shipped).toBe(4);
    expect(result.metrics.delivered).toBe(2);
    expect(result.metrics.returned).toBe(1);
    expect(result.metrics.pending).toBe(1);
    expect(result.metrics.deliveryRate).toBe(0.5);
    expect(result.metrics.returnRate).toBe(0.25);
    expect(result.metrics.pendingRate).toBe(0.25);
  });

  it("all rows have exactly 45 columns", () => {
    const input: ReconciliationInput = {
      ...baseInput,
      codLeads: [
        { first_name: "A", phone: "111", extra_field: "xyz" },
      ],
      codOrders: [
        { first_name: "B", phone: "222", another: "field" },
      ],
      lfOrders: [
        { name_1: "C", phone_number: "333", misc: 123 },
      ],
    };

    const result = reconcile(input);

    result.rows.forEach((row) => {
      expect(row).toHaveLength(45);
    });
  });
});
