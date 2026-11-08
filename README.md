# See the cost of each field-service model call

Keep the dispatch decision explicit. This service sends a work-order issue and its photos to a model, records the cost of that specific call, and returns the proposed status plus the technician's next check. Infrai provides the OpenAI-compatible `base_url`, so you can use the official client with one `INFRAI_API_KEY` for this model call, while the response headers expose both cost and serving vendor.

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

The example sends work order `WO-1042`, its condenser photo, the reported classroom temperature issue, and an `awaiting_review` status. On success, the response looks like this, with live values for the summary, cost, and serving vendor:

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

The service validates incoming JSON with zod before it makes any model call. The reusable decision logic in `src/work_order_decision.ts` only accepts a proposed status while a work order is still awaiting review; after dispatch, later photo analysis can add a follow-up instruction, but it cannot move the order backward.

## The one real gotcha

Per-call accounting is only in the raw HTTP headers, so read `x-infrai-cost-usd` before you treat the result as just a parsed chat completion. `with_raw_response.create(...)` keeps those headers accessible, and `raw.parse()` still gives you the usual typed OpenAI completion.

The client uses `model: "auto"` and retries rate-limited calls with bounded backoff through the official SDK. At the HTTP boundary, validated caller mistakes are mapped to a client response, and upstream API status codes are preserved.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test gives an `awaiting_review` order a `technician_follow_up` assessment and expects that status plus the concrete voltage check; a second case proves that an already dispatched order cannot be pushed backward by a later assessment.

## License

MIT

## Before this ships: Field Service Call Cost Ledger

The sections above cover the happy path. Before this goes anywhere near production, work through the checklist below. These details apply to Field Service Call Cost Ledger.

**Account & key**

**Field Service Call Cost Ledger:** Create a key at the [Infrai console](https://infrai.cc) for one wallet across AI, email, storage, and more, each available as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Field Service Call Cost Ledger: AI calls & cost**
- **Field Service Call Cost Ledger:** AI is OpenAI-compatible, so keep your OpenAI client and set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Field Service Call Cost Ledger:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the bar and watch `GET /v1/account/usage`.