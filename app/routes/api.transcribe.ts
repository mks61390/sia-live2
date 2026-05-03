import { GoogleGenAI } from "@google/genai";
import { getSupabaseUserId } from "~/lib/session";
import type { Route } from "./+types/api.transcribe";

export async function action({ request }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return new Response(JSON.stringify({ error: "No audio file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await audio.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = audio.type || "audio/webm";

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: { mimeType, data: base64 },
          },
          {
            text: "Transcribe this audio recording exactly as spoken. Return only the transcript text, nothing else.",
          },
        ],
      },
    ],
  });

  const transcript =
    response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  return new Response(JSON.stringify({ transcript }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
