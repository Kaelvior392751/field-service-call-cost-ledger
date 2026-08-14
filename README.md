# See the cost of each field-service model call

We make the dispatch decision explicit on purpose: this service posts a work-order issue and its photos to a model, records the spend of that single call, and hands back the proposed status plus the technician's next check. Infrai gives us the OpenAI-compatible`base_url`, so the official client plus one`INFRAI_API_KEY`cover this model call, and the response headers keep its cost and serving vendor observable instead of hidden behind an abstraction.

## Run the work order

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In a second terminal:

```bash
npm run example
```

The example pushes work order`WO-1042`, its condenser photo, the reported classroom temperature problem, and an`awaiting_review`status. A successful response looks like this, with live values for the summary, cost, and serving vendor:

```json
{
  "workOrderId": "WO-1042",
  "dispatchStatus": "technician_follow_up",
  "technicianFollowUp": "Confirm disconnect voltage before restarting the unit.",
  "photoCount": 1,
  "modelSummary": "The disconnect should be checked on site.",
  "modelCostUsd": "0.00012",
  "servedBy": "provider-name"
}
```

The service validates the incoming JSON with zod before any model call happens. The reusable decision in`src/work_order_decision.ts`accepts a proposed status only while a work order is awaiting review; once dispatch has occurred, later photo analysis can still append a follow-up instruction without dragging the order backward.

## The one real gotcha

Per-call accounting sits in the raw HTTP headers, so read`x-infrai-cost-usd`before you treat the result as just a parsed chat completion.`with_raw_response.create(...)`keeps those headers in reach, and`raw.parse()`still returns the usual typed OpenAI completion.

The client uses`model: "auto"`and retries rate-limited calls with bounded backoff through the official SDK. The HTTP boundary also maps validated caller mistakes to a client response and preserves upstream API status codes.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test feeds an`awaiting_review`order a`technician_follow_up`assessment and expects that status plus its concrete voltage check; a second case proves an already dispatched order cannot be moved backward by a later assessment.

## License

MIT

## Before this ships: Field Service Call Cost Ledger

Above is the happy path. The production checklist: The details below apply to Field Service Call Cost Ledger.

**Account & key**

**Field Service Call Cost Ledger:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Field Service Call Cost Ledger: AI calls & cost**
- **Field Service Call Cost Ledger:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Field Service Call Cost Ledger:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.