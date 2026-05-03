import OpenAI from "openai";
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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

  const file = new File([audio], "recording.webm", {
    type: audio.type || "audio/webm",
  });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  });

  return new Response(JSON.stringify({ transcript: response.text }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
