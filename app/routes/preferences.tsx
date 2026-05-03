import { useRef, useState, useCallback } from "react";
import { useActionData, useNavigate, useNavigation } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/preferences";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { extractPreferences } from "~/lib/preferenceExtraction";
import { Button } from "~/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

export function meta() {
  return [{ title: "Your preferences — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServer();
  const { data: profile } = await supabase
    .from("tenant_profiles")
    .select("completed_blocks, extracted_fields")
    .eq("tenant_id", userId);

  const row = profile as Array<{ completed_blocks: number }> | null;
  if (row && row[0] && row[0].completed_blocks >= 1) {
    throw redirect("/interview");
  }

  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return new Response(
      JSON.stringify({ error: "Please describe what you're looking for." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const extracted = await extractPreferences(text);

  const supabase = createSupabaseServer();
  await supabase.from("tenant_profiles").upsert({
    tenant_id: userId,
    raw_input: text,
    budget_max: extracted.budget_max,
    bedrooms: extracted.bedrooms,
    move_in_date: extracted.move_in_date,
    neighborhoods: extracted.neighborhoods,
    lifestyle_signals: extracted.lifestyle_signals,
    extracted_fields: extracted.extracted_fields,
    updated_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      confirmation: extracted.confirmation_message,
      extracted,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

type ActionData = {
  confirmation: string;
  extracted: Awaited<ReturnType<typeof extractPreferences>>;
  error?: string;
};

export default function Preferences() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Navigate to /interview after showing the confirmation for 2s
  const [confirming, setConfirming] = useState(false);
  if (actionData?.confirmation && !confirming) {
    setConfirming(true);
    setTimeout(() => navigate("/interview"), 2000);
  }

  const startRecording = useCallback(async () => {
    setTranscribeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Transcription failed");
          const { transcript } = (await res.json()) as { transcript: string };
          if (textareaRef.current) {
            textareaRef.current.value = transcript;
          }
        } catch {
          setTranscribeError("Could not transcribe audio — please type your preferences instead.");
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setTranscribeError("Could not access microphone.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  if (actionData?.confirmation) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-4 text-2xl">✨</div>
            <p className="text-lg leading-relaxed">{actionData.confirmation}</p>
            <p className="mt-4 text-sm text-muted-foreground">Setting up your matches…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold">What are you looking for?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your ideal apartment — budget, location, size, lifestyle. Anything helps.
          </p>
        </div>

        <form method="post" className="space-y-4">
          {/* Voice record button — prominent at the top */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting || isTranscribing}
              className="flex items-center gap-2"
            >
              {isRecording ? (
                <>
                  <MicOff className="size-5" />
                  Stop recording
                </>
              ) : (
                <>
                  <Mic className="size-5" />
                  Record your preferences
                </>
              )}
            </Button>
            {isRecording && (
              <span className="text-sm text-muted-foreground animate-pulse">Recording…</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">or type below</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              name="text"
              rows={5}
              placeholder='e.g. "2-bedroom in Tel Aviv under ₪7,000, moving in September, have a dog"'
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
              disabled={isSubmitting || isTranscribing}
            />
            {isTranscribing && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="ml-2 text-sm">Transcribing…</span>
              </div>
            )}
          </div>

          {transcribeError && (
            <p className="text-sm text-destructive">{transcribeError}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isTranscribing || isRecording}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Analysing…
              </span>
            ) : (
              "Find my apartment"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
