import {
  calculateMetrics,
  formatRate,
  countShipmentStatuses,
} from "../lib/reconciliation/metrics";

describe("calculateMetrics", () => {
  it("calculates correct rates", () => {
    const result = calculateMetrics({
      shipped: 100,
      delivered: 85,
      returned: 10,
      pending: 5,
    });

    expect(result.deliveryRate).toBe(0.85);
    expect(result.returnRate).toBe(0.1);
    expect(result.pendingRate).toBe(0.05);
  });

  it("returns 0 rates when shipped is 0", () => {
    const result = calculateMetrics({
      shipped: 0,
      delivered: 0,
      returned: 0,
      pending: 0,
    });

    expect(result.deliveryRate).toBe(0);
    expect(result.returnRate).toBe(0);
    expect(result.pendingRate).toBe(0);
  });

  it("handles non-round numbers", () => {
    const result = calculateMetrics({
      shipped: 3,
      delivered: 1,
      returned: 1,
      pending: 1,
    });

    expect(result.deliveryRate).toBeCloseTo(0.3333, 3);
    expect(result.returnRate).toBeCloseTo(0.3333, 3);
    expect(result.pendingRate).toBeCloseTo(0.3333, 3);
  });

  it("preserves raw counts in result", () => {
    const result = calculateMetrics({
      shipped: 200,
      delivered: 150,
      returned: 30,
      pending: 20,
    });

    expect(result.shipped).toBe(200);
    expect(result.delivered).toBe(150);
    expect(result.returned).toBe(30);
    expect(result.pending).toBe(20);
  });
});

describe("formatRate", () => {
  it("formats rate as percentage string", () => {
    expect(formatRate(0.85)).toBe("85.0%");
    expect(formatRate(0.1)).toBe("10.0%");
    expect(formatRate(1)).toBe("100.0%");
    expect(formatRate(0)).toBe("0.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatRate(0.8567)).toBe("85.7%");
    expect(formatRate(0.3333)).toBe("33.3%");
  });
});

describe("countShipmentStatuses", () => {
  it("counts statuses correctly", () => {
    const records = [
      { status: "delivered" },
      { status: "delivered" },
      { status: "returned" },
      { status: "pending" },
      { status: "in_transit" },
    ];

    const counts = countShipmentStatuses(records);

    expect(counts.shipped).toBe(5);
    expect(counts.delivered).toBe(2);
    expect(counts.returned).toBe(1);
    expect(counts.pending).toBe(2); // pending + in_transit
  });

  it("handles alternative status names", () => {
    const records = [
      { status: "dlv" },
      { status: "rtn" },
      { status: "transit" },
      { status: "out_for_delivery" },
    ];

    const counts = countShipmentStatuses(records);

    expect(counts.delivered).toBe(1);
    expect(counts.returned).toBe(1);
    expect(counts.pending).toBe(2);
  });

  it("is case-insensitive", () => {
    const records = [
      { status: "DELIVERED" },
      { status: "Returned" },
      { status: "PENDING" },
    ];

    const counts = countShipmentStatuses(records);

    expect(counts.delivered).toBe(1);
    expect(counts.returned).toBe(1);
    expect(counts.pending).toBe(1);
  });

  it("uses custom status field name", () => {
    const records = [
      { shipping_status: "delivered" },
      { shipping_status: "returned" },
    ];

    const counts = countShipmentStatuses(records, "shipping_status");

    expect(counts.delivered).toBe(1);
    expect(counts.returned).toBe(1);
  });

  it("handles empty array", () => {
    const counts = countShipmentStatuses([]);

    expect(counts.shipped).toBe(0);
    expect(counts.delivered).toBe(0);
    expect(counts.returned).toBe(0);
    expect(counts.pending).toBe(0);
  });
});
