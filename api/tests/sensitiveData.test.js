import assert from "node:assert/strict";
import test from "node:test";
import { redactSensitiveData } from "../src/middleware/sensitiveData.js";

test("redacts cost and margin data for restricted users", () => {
  const result = redactSensitiveData({
    visibleRevenue: 1200,
    visibleCost: 700,
    grossMargin: 500,
    marginPercent: 41.67,
    costRate: 22,
    costHistory: [{ costRate: 22 }],
    rows: [
      { id: "revenue", label: "Revenue", caption: "$1,200 actual" },
      { id: "cost", label: "Cost Burn", caption: "$700 actual / $800 planned" },
      { id: "margin", label: "Margin Health", caption: "Actual GM% vs planned 35%" }
    ],
    audit: {
      oldValue: JSON.stringify({ billRate: 120, costRate: 22, grossMargin: 500 })
    }
  }, { canViewCost: false, canViewMargin: false });

  assert.equal(result.visibleRevenue, 1200);
  assert.equal(result.visibleCost, undefined);
  assert.equal(result.grossMargin, undefined);
  assert.equal(result.marginPercent, undefined);
  assert.equal(result.costRate, undefined);
  assert.equal(result.costHistory, undefined);
  assert.deepEqual(result.rows, [
    { id: "revenue", label: "Revenue", caption: "$1,200 actual" }
  ]);
  assert.deepEqual(JSON.parse(result.audit.oldValue), { billRate: 120 });
});

test("preserves cost and margin data for authorized users", () => {
  const result = redactSensitiveData({
    visibleRevenue: 1200,
    visibleCost: 700,
    grossMargin: 500,
    marginPercent: 41.67,
    rows: [
      { id: "cost", label: "Cost Burn", caption: "$700 actual / $800 planned" },
      { id: "margin", label: "Margin Health", caption: "Actual GM% vs planned 35%" }
    ]
  }, { canViewCost: true, canViewMargin: true });

  assert.equal(result.visibleCost, 700);
  assert.equal(result.grossMargin, 500);
  assert.equal(result.marginPercent, 41.67);
  assert.equal(result.rows.length, 2);
});
