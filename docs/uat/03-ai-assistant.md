# UAT — AI Assistant (Database Q&A)

**Route:** `/ai/assistant`  
**Permission:** Same as AI desk

---

## Purpose

Ask natural-language questions; system runs **read-only SELECT** queries scoped to your company (and warehouse for salesmen) and returns answers with tables, metrics, and charts.

---

## Prerequisites

- Server Gemini API configured.
- Familiarity with your test data (product names, dates).

---

## Features to test

| # | Test | Expected | Pass? |
| --- | --- | --- | --- |
| AI-A1 | Simple English question | e.g. "What were total sales today?" — numeric answer, no crash | |
| AI-A2 | Answer matches Sales tab | Total aligns with **Sales** → Today | |
| AI-A3 | Stock question | e.g. "How much cement in Merkato store?" matches **Live stock** | |
| AI-A4 | Table result | Structured rows render in styled table | |
| AI-A5 | Metric cards | Key numbers shown in highlight cards when applicable | |
| AI-A6 | Chart | Bar/pie chart when breakdown returned | |
| AI-A7 | **Smart Clarify** toggle OFF | Question sent directly to chat | |
| AI-A8 | **Smart Clarify** toggle ON | Shows 3 suggested rephrased questions as pills | |
| AI-A9 | Click suggestion pill | Sends perfected question; gets answer | |
| AI-A10 | Copy response | Copies text to clipboard | |
| AI-A11 | Export CSV | Downloads data when table present | |
| AI-A12 | Regenerate | Re-runs last question | |
| AI-A13 | Amharic / Afaan Oromo / Tigrinya question | Answer in same language; RTL text readable | |
| AI-A14 | Nonsense / unsafe request | Polite refusal or "cannot answer", not server error | |
| AI-A15 | Salesman login | Cannot see other companies' data; warehouse-scoped where relevant | |

---

## Also verify (cross-module)

| Question type | Ground truth tab |
| --- | --- |
| Sales, revenue, unpaid | [04-sales.md](./04-sales.md), [08-debit-credit.md](./08-debit-credit.md) |
| Stock quantities | [07-live-stock.md](./07-live-stock.md) |
| Purchases | [06-purchasing.md](./06-purchasing.md) |
| Profit | [15-reports.md](./15-reports.md), [11-income-statement.md](./11-income-statement.md) |

---

## Security expectations (pass = must hold)

- Cannot delete, update, or insert data via chat.
- Cannot see password hashes or other companies' rows.
- API key never visible in browser network tab responses.

---

## Data affected

Read-only.

---

## Fail notes

```
Issue:
Question asked:
Expected:
Actual:
```
