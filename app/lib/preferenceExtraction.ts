import OpenAI from "openai";

export interface ExtractedPreferences {
  budget_max: number | null;
  bedrooms: number | null;
  move_in_date: string | null;
  neighborhoods: string[];
  lifestyle_signals: Record<string, unknown>;
  extracted_fields: string[];
  confirmation_message: string;
}

const EMPTY_RESULT: ExtractedPreferences = {
  budget_max: null,
  bedrooms: null,
  move_in_date: null,
  neighborhoods: [],
  lifestyle_signals: {},
  extracted_fields: [],
  confirmation_message:
    "Got it — let me ask a few questions to find your ideal apartment.",
};

const SYSTEM_PROMPT = `You are a rental search assistant for English-speaking immigrants in Israel.

Extract apartment preferences from the tenant's message and return a JSON object with exactly these fields:
- budget_max: integer (ILS/NIS), or null if not mentioned
- bedrooms: integer number of bedrooms, or null if not mentioned
- move_in_date: ISO date string (YYYY-MM-DD), or null if not mentioned (interpret relative dates like "August" as the next occurrence)
- neighborhoods: array of neighborhood strings (e.g. ["Tel Aviv - North", "Florentin"]), empty array if none
- lifestyle_signals: object of lifestyle details (e.g. { pets: true, parking: true, wfh: true }), empty object if none
- extracted_fields: array of field names that were actually extracted (only include fields with non-null / non-empty values)
- confirmation_message: a warm, specific, conversational message referencing the details you found. Sound like a helpful concierge, not a robot. Example: "You're looking for a 2-bedroom under ₪7,000 in north Tel Aviv, moving in August — and you have a dog, so I'll filter for pet-friendly listings. Finding your best matches now."

If no useful fields could be extracted, set extracted_fields to [] and confirmation_message to "Got it — let me ask a few questions to find your ideal apartment."

Return ONLY valid JSON. No markdown, no explanation.`;

export async function extractPreferences(
  text: string
): Promise<ExtractedPreferences> {
  if (!text.trim()) {
    return EMPTY_RESULT;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as ExtractedPreferences;
    return {
      budget_max: parsed.budget_max ?? null,
      bedrooms: parsed.bedrooms ?? null,
      move_in_date: parsed.move_in_date ?? null,
      neighborhoods: Array.isArray(parsed.neighborhoods)
        ? parsed.neighborhoods
        : [],
      lifestyle_signals:
        parsed.lifestyle_signals &&
        typeof parsed.lifestyle_signals === "object"
          ? parsed.lifestyle_signals
          : {},
      extracted_fields: Array.isArray(parsed.extracted_fields)
        ? parsed.extracted_fields
        : [],
      confirmation_message:
        typeof parsed.confirmation_message === "string" &&
        parsed.confirmation_message.trim()
          ? parsed.confirmation_message
          : EMPTY_RESULT.confirmation_message,
    };
  } catch {
    return EMPTY_RESULT;
  }
}
