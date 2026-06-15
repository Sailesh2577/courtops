// POST /api/copilot — the operator copilot's brain, server-side only.
//
// The browser sends { command, snapshot }. We call Gemini with a strict JSON
// response schema, parse the proposed plan, and validate every step against the
// ids in the snapshot before returning it. We never touch the database here: the
// copilot only PROPOSES. The browser shows the plan, the organizer approves it,
// and the store applies it (reusing the same persist path as resolving a flag).
//
// GEMINI_API_KEY is read here and never shipped to the browser (no NEXT_PUBLIC
// prefix). The model name is overridable with GEMINI_MODEL.

import { NextResponse } from "next/server";
import {
  validatePlan,
  type CopilotPlan,
  type CopilotSnapshot,
} from "@/lib/copilot";

// Route Handlers are not cached, but be explicit: this is always request-time.
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Gemini's responseSchema is a subset of OpenAPI. Each action kind is its own
// branch in an anyOf so the model is forced to fill the fields that kind needs
// (a single shared object with optional fields lets the model leave courtId or
// the message body blank, which we then have to drop). 2.5 models support anyOf.
const STEP_SCHEMAS = [
  {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["assign_court"] },
      label: { type: "string" },
      matchId: { type: "string" },
      courtId: { type: "string" },
    },
    required: ["kind", "label", "matchId", "courtId"],
  },
  {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["move_block"] },
      label: { type: "string" },
      blockId: { type: "string" },
      toSlot: { type: "integer" },
    },
    required: ["kind", "label", "blockId", "toSlot"],
  },
  {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["resolve_flag"] },
      label: { type: "string" },
      flagId: { type: "string" },
    },
    required: ["kind", "label", "flagId"],
  },
  {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["send_message"] },
      label: { type: "string" },
      to: { type: "string" },
      channel: { type: "string" },
      body: { type: "string" },
    },
    required: ["kind", "label", "to", "channel", "body"],
  },
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    note: { type: "string" },
    steps: { type: "array", items: { anyOf: STEP_SCHEMAS } },
  },
  required: ["summary", "steps"],
} as const;

const SYSTEM = `You are the operations copilot for CourtOps, a live badminton tournament console used by an organizer on the day of the event.

Your job: read the current state and the organizer's request, then propose a concrete PLAN of steps to fix it. You only suggest. A human approves before anything changes, so never claim you have already done something.

Rules:
- Use ONLY ids that appear in the provided state (match ids, court ids, flag ids, block ids). Never invent an id.
- Prefer the smallest plan that solves the request. One or two steps is normal.
- A court can only take a match if it is idle. Only assign a match that has no court yet (status "ready" or "warming").
- When a player needs to be told something (their court is ready, a delay), include a send_message step. Write the body as a short, warm, specific note from the tournament desk, under 220 characters, no emoji.
- If a matching flag already exists in the feed for what you are doing, include a resolve_flag step so the decision feed stays clean.
- Every step needs a clear one-line "label" describing it in plain language.
- If the request cannot be acted on with the available state, return an empty steps array and explain why in the summary.

Step kinds and their fields:
- assign_court: matchId, courtId
- move_block: blockId, toSlot (integer slot index)
- resolve_flag: flagId
- send_message: to, channel, body`;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Copilot is not configured (missing GEMINI_API_KEY)." },
      { status: 503 },
    );
  }

  let body: { command?: string; snapshot?: CopilotSnapshot };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const command = body.command?.trim();
  const snapshot = body.snapshot;
  if (!command || !snapshot) {
    return NextResponse.json(
      { error: "Both a command and a state snapshot are required." },
      { status: 400 },
    );
  }

  const userPrompt = `Organizer request:\n${command}\n\nCurrent tournament state (JSON):\n${JSON.stringify(
    snapshot,
  )}`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            // Disable "thinking": this is a constrained mapping task, and
            // thinking can truncate structured output and adds latency.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not reach the model. Check your connection." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    console.warn("Gemini error:", data.error?.message);
    return NextResponse.json(
      { error: data.error?.message || "The model returned an error." },
      { status: 502 },
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json(
      { error: "The model returned an empty plan." },
      { status: 502 },
    );
  }

  let parsed: CopilotPlan;
  try {
    parsed = JSON.parse(text) as CopilotPlan;
  } catch {
    return NextResponse.json(
      { error: "The model returned a plan we couldn't read." },
      { status: 502 },
    );
  }

  // Drop any step that references an id not in the snapshot. The model is told
  // not to invent ids, but we enforce it rather than trust it.
  const { plan, dropped } = validatePlan(normalize(parsed), snapshot);
  if (dropped.length) console.warn("Dropped invalid copilot steps:", dropped);

  return NextResponse.json({ plan });
}

// Narrow each loosely-typed step (every field optional in the schema) down to
// the fields its kind actually uses, so the client gets clean CopilotActions.
function normalize(raw: CopilotPlan): CopilotPlan {
  const steps = (raw.steps || [])
    .map((s) => {
      const a = s as Record<string, unknown>;
      const label = String(a.label ?? "");
      switch (a.kind) {
        case "assign_court":
          return {
            kind: "assign_court" as const,
            label,
            matchId: String(a.matchId ?? ""),
            courtId: String(a.courtId ?? ""),
          };
        case "move_block":
          return {
            kind: "move_block" as const,
            label,
            blockId: String(a.blockId ?? ""),
            toSlot: Number(a.toSlot ?? 0),
          };
        case "resolve_flag":
          return {
            kind: "resolve_flag" as const,
            label,
            flagId: String(a.flagId ?? ""),
          };
        case "send_message":
          return {
            kind: "send_message" as const,
            label,
            to: String(a.to ?? ""),
            channel: String(a.channel ?? "SMS"),
            body: String(a.body ?? ""),
          };
        default:
          return null;
      }
    })
    .filter((s): s is CopilotPlan["steps"][number] => s !== null);

  return { summary: String(raw.summary ?? ""), note: raw.note, steps };
}
