const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const math = require("../src/modules/ai/analytics.math");
const { interpretLocal, detectLanguage } = require("../src/modules/ai/intent.local");

describe("AI analytics math", () => {
  it("computes gross profit and margin from money strings", () => {
    const profit = math.grossProfit("850000.00", "560000.00");
    assert.equal(profit, "290000.00");
    assert.equal(math.marginPct(profit, "850000.00"), "34.12");
  });

  it("returns null margin when revenue is zero", () => {
    assert.equal(math.marginPct("10.00", "0.00"), null);
  });

  it("computes percent change and treats zero previous as unknown when current is not zero", () => {
    assert.equal(math.percentChange("118.00", "100.00"), "18.00");
    assert.equal(math.percentChange("50.00", "0.00"), null);
    assert.equal(math.percentChange("0.00", "0.00"), "0.00");
  });

  it("estimates days remaining and purchase qty from velocity", () => {
    assert.equal(math.daysRemaining(42, 6), 7);
    assert.equal(math.daysRemaining(10, 0), null);
    assert.ok(math.recommendedQty(2, 21, 5, 0) > 0);
  });
});

describe("AI local intent", () => {
  it("detects Amharic and maps profit questions", () => {
    assert.equal(detectLanguage("የዚህ ወር ትርፌ ስንት ነው?"), "am");
    const mapped = interpretLocal("Which product gives me the highest profit?");
    assert.equal(mapped.intent, "getTopProfitableProducts");
  });

  it("maps salesman and comparison questions", () => {
    assert.equal(interpretLocal("Who is my best salesman?").intent, "getSalesmanPerformance");
    assert.equal(interpretLocal("Compare this month with last month.").intent, "comparePeriods");
  });
});
