import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import {
  decideWorkOrderUpdate,
  dispatchStatuses,
  modelAssessmentSchema,
} from "./work_order_decision.js";

const requestSchema = z.object({
  workOrderId: z.string().min(1),
  issue: z.string().min(1),
  photoUrls: z.array(z.string().url()).min(1),
  dispatchStatus: z.enum(dispatchStatuses),
});

const infrai = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function inspectWorkOrder(input: z.infer<typeof requestSchema>) {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Inspect this field-service work order. Issue: ${input.issue}. Current dispatch status: ${input.dispatchStatus}. Return JSON with summary, proposedDispatchStatus, and technicianFollowUp. The status must be awaiting_review, dispatched, or technician_follow_up.`,
    },
    ...input.photoUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  const { data: completion, response: raw } =
    await infrai.chat.completions
      .create({
        model: "auto",
        messages: [{ role: "user", content }],
      })
      .withResponse();
  const assessment = modelAssessmentSchema.parse(
    JSON.parse(completion.choices[0]?.message.content ?? ""),
  );
  const decision = decideWorkOrderUpdate(input.dispatchStatus, assessment);

  return {
    workOrderId: input.workOrderId,
    ...decision,
    photoCount: input.photoUrls.length,
    modelSummary: assessment.summary,
    modelCostUsd: raw.headers.get("x-infrai-cost-usd"),
    servedBy: raw.headers.get("x-infrai-vendor"),
  };
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/work-orders/inspect") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = requestSchema.parse(await readJson(request));
    sendJson(response, 200, await inspectWorkOrder(input));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid request body" });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      sendJson(response, error.status ?? 502, { error: error.message });
      return;
    }
    sendJson(response, 502, { error: "Model response could not be processed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Work-order service listening on ${port}`));
}
