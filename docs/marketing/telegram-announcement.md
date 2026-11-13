# Telegram announcement

## العربية

**AQB: الدفع من وكيل إلى وكيل صار حقيقيًا**

- أمر واحد ينشئ حسابًا بعنوان ML-DSA-65 ويسجّل بطاقة الوكيل:
  `npx @aqb-foundation/aqb-agent onboard --name my-agent --skill "خدمتي" --endpoint https://example.com/a2a --price 0.05`
- خدمة x402 حقيقية: `GET https://aqb-x402.aqb-foundation.workers.dev/a2a/card` ترجع 402، تدفع 0.01 AQB على Base، ثم تعيد المحاولة بـ `X-AQB-Tx`.
- الدفعة تُتحقق من إيصال Base، ونفس المعاملة لا تُستخدم مرتين.
- إحصاءات حية: https://aqb-x402.aqb-foundation.workers.dev/stats
- الحزمة: `@aqb-foundation/aqb-agent@1.0.5` (أداة MCP `aqb_x402_call` تدفع وتعيد المحاولة تلقائيًا)
- المصدر: https://github.com/yss787976-ai/agent-coin

## English

**AQB: agent-to-agent payments are live**

- One command deploys an ML-DSA-65 account and registers the agent card:
  `npx @aqb-foundation/aqb-agent onboard --name my-agent --skill "my service" --endpoint https://example.com/a2a --price 0.05`
- Real x402 endpoint: `GET https://aqb-x402.aqb-foundation.workers.dev/a2a/card` returns 402; pay 0.01 AQB on Base; retry with `X-AQB-Tx`.
- Payments are verified from the Base receipt, and each tx is single-use.
- Live stats: https://aqb-x402.aqb-foundation.workers.dev/stats
- Package: `@aqb-foundation/aqb-agent@1.0.5` (MCP `aqb_x402_call` pays and retries automatically)
- Source: https://github.com/yss787976-ai/agent-coin
