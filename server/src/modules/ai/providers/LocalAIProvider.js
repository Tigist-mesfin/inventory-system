const AIProvider = require("./AIProvider");
const { interpretLocal, detectLanguage } = require("../intent.local");
const money = (v) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pickTop = (data) => {
  if (data.products?.[0]) return data.products[0];
  if (data.salesmen?.[0]) return data.salesmen[0];
  if (data.warehouses?.[0]) return data.warehouses[0];
  if (data.recommendations?.[0]) return data.recommendations[0];
  return null;
};

const keyNumbersFrom = (data) => {
  if (data.revenue != null && data.grossProfit != null) {
    return {
      Revenue: `${money(data.revenue)} ETB`,
      COGS: `${money(data.cogs)} ETB`,
      "Gross profit": `${money(data.grossProfit)} ETB`,
      Margin: data.profitMargin == null ? "n/a" : `${data.profitMargin}%`,
      Invoices: data.invoiceCount,
    };
  }
  const top = pickTop(data);
  if (top?.revenue != null) {
    return {
      Item: top.productName || top.name || top.product,
      Revenue: `${money(top.revenue)} ETB`,
      COGS: top.cogs != null ? `${money(top.cogs)} ETB` : undefined,
      "Gross profit": top.grossProfit != null ? `${money(top.grossProfit)} ETB` : undefined,
      Margin: top.profitMargin != null ? `${top.profitMargin}%` : undefined,
      "Units sold": top.quantitySold,
    };
  }
  if (data.totalValue != null) {
    return { "Inventory value": `${money(data.totalValue)} ETB`, Rows: data.rows?.length };
  }
  if (data.deadStockValue != null) {
    return {
      "Dead stock value": `${money(data.deadStockValue)} ETB`,
      Products: data.products?.length,
    };
  }
  return data.meta || {};
};

const templates = {
  en: (q, data) => {
    const top = pickTop(data);
    const period = data.meta?.period || "the selected period";
    if (data.current && data.previous) {
      return {
        answer: `Sales in this period were ${money(data.current.revenue)} ETB versus ${money(data.previous.revenue)} ETB in the previous period (${data.change.revenue == null ? "previous was zero" : data.change.revenue + "%"}).`,
        recommendation: "Review the products and stores that moved the change.",
      };
    }
    if (data.revenue != null) {
      return {
        answer: `Completed sales for ${period} total ${money(data.revenue)} ETB across ${data.invoiceCount} invoices, with gross profit ${money(data.grossProfit)} ETB.`,
        recommendation: Number(data.grossProfit) < 0
          ? "Investigate loss-making lines before buying more of those items."
          : "Keep stock on items that both sell and hold a positive margin.",
      };
    }
    if (top?.productName || top?.name) {
      return {
        answer: `${top.productName || top.name} is the leading result for this question.`,
        recommendation: "Maintain enough stock if volume and margin are both strong.",
      };
    }
    return {
      answer: `I analysed the company records for ${period}.`,
      recommendation: "Ask a more specific question if you need another cut of the same data.",
    };
  },
  am: (q, data) => {
    const period = data.meta?.period || "የተመረጠው ጊዜ";
    if (data.revenue != null) {
      return {
        answer: `በ${period} የተጠናቀቀ ሽያጭ ${money(data.revenue)} ብር ነው (${data.invoiceCount} ደረሰኞች)። ጠቅላላ ትርፍ ${money(data.grossProfit)} ብር ነው።`,
        recommendation: "በትርፍ እና በሽያጭ መጠን ጠንካራ የሆኑትን እቃዎች ክምችት ይጠብቁ።",
      };
    }
    const top = pickTop(data);
    return {
      answer: top
        ? `${top.productName || top.name} ለዚህ ጥያቄ የመጀመሪያው ውጤት ነው።`
        : `መረጃው ከመዝገብ ተሰልቷል።`,
      recommendation: "ተጨማሪ ጥያቄ ካለዎት ወቅት ወይም መጋዘን ይምረጡ።",
    };
  },
  om: (q, data) => {
    const period = data.meta?.period || "yeroo filatame";
    if (data.revenue != null) {
      return {
        answer: `Gurgurtaa xumurame ${period} ${money(data.revenue)} ETB (${data.invoiceCount} invoice). Bu'aan waliigalaa ${money(data.grossProfit)} ETB.`,
        recommendation: "Omisha bu'aa fi gurgurtaa cimaa qaban kuusaa.",
      };
    }
    const top = pickTop(data);
    return {
      answer: top
        ? `${top.productName || top.name} gaaffii kanaaf bu'aa duraa dha.`
        : `Deetaan kuusaa irraa shallagameera.`,
      recommendation: "Gaaffii dabalataaf yeroo ykn kuusaa filadhu.",
    };
  },
};

class LocalAIProvider extends AIProvider {
  constructor() {
    super("local");
  }

  async interpret(question, filters) {
    return interpretLocal(question, filters);
  }

  async explain(question, data, language) {
    const lang = language || detectLanguage(question);
    const packed = templates[lang] || templates.en;
    const text = packed(question, data);
    return {
      answer: text.answer,
      keyNumbers: keyNumbersFrom(data),
      explanation: data.meta?.calculation || "Figures are summed from completed database records only.",
      recommendation: text.recommendation,
      language: lang,
    };
  }
}

module.exports = LocalAIProvider;
module.exports.keyNumbersFrom = keyNumbersFrom;
