import { Link, useLoaderData, useNavigation } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/interview";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  BLOCKS,
  getEffectiveCompletedBlocks,
  getCurrentBlock,
  getVisibleQuestionsForBlock,
  mergeAnswers,
  type ProfileSnapshot,
  type Question,
} from "~/lib/interviewState";

export function meta() {
  return [{ title: "Interview — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("tenant_id", userId);

  const row = (data as Array<Record<string, unknown>> | null)?.[0] ?? null;
  const completedBlocks = (row?.completed_blocks as number) ?? 0;
  const extractedFields = (row?.extracted_fields as string[]) ?? [];
  const lifestyleSignals = (row?.lifestyle_signals as Record<string, unknown>) ?? {};

  const effectiveBlocks = getEffectiveCompletedBlocks(
    completedBlocks,
    extractedFields,
    lifestyleSignals
  );

  if (effectiveBlocks !== completedBlocks) {
    await supabase.from("tenant_profiles").upsert({
      tenant_id: userId,
      completed_blocks: effectiveBlocks,
      updated_at: new Date().toISOString(),
    });
  }

  const currentBlock = getCurrentBlock(effectiveBlocks, extractedFields, lifestyleSignals);
  if (!currentBlock) throw redirect("/browse");

  const visibleQuestions = getVisibleQuestionsForBlock(
    currentBlock,
    extractedFields,
    lifestyleSignals
  );

  return {
    currentBlockIndex: currentBlock.index,
    visibleQuestions,
    completedBlocks: effectiveBlocks,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const formData = await request.formData();
  const blockIndex = parseInt(String(formData.get("block_index") ?? "0"), 10);
  const block = BLOCKS[blockIndex];
  if (!block) throw redirect("/browse");

  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("tenant_id", userId);

  const row = (data as Array<Record<string, unknown>> | null)?.[0] ?? null;
  const profile: ProfileSnapshot = {
    budget_max: (row?.budget_max as number | null) ?? null,
    bedrooms: (row?.bedrooms as number | null) ?? null,
    move_in_date: (row?.move_in_date as string | null) ?? null,
    neighborhoods: (row?.neighborhoods as string[]) ?? [],
    lifestyle_signals: (row?.lifestyle_signals as Record<string, unknown>) ?? {},
    extracted_fields: (row?.extracted_fields as string[]) ?? [],
    completed_blocks: (row?.completed_blocks as number) ?? 0,
  };

  const answers: Record<string, string> = {};
  for (const question of block.questions) {
    const val = String(formData.get(question.id) ?? "").trim();
    if (val) answers[question.id] = val;
  }

  const update = mergeAnswers(profile, answers, block);
  const newCompletedBlocks = Math.max(profile.completed_blocks ?? 0, blockIndex + 1);

  await supabase.from("tenant_profiles").upsert({
    tenant_id: userId,
    ...update,
    completed_blocks: newCompletedBlocks,
    updated_at: new Date().toISOString(),
  });

  throw redirect("/interview");
}

function QuestionField({ question }: { question: Question }) {
  const baseInput =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  if (question.type === "number") {
    return (
      <input
        type="number"
        name={question.id}
        placeholder={question.placeholder}
        className={baseInput}
        min={0}
      />
    );
  }
  if (question.type === "date") {
    return <input type="date" name={question.id} className={baseInput} />;
  }
  if (question.type === "text") {
    return (
      <input
        type="text"
        name={question.id}
        placeholder={question.placeholder}
        className={baseInput}
      />
    );
  }
  if (question.type === "yesno") {
    return (
      <div className="flex gap-6">
        {["yes", "no"].map((val) => (
          <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name={question.id} value={val} className="accent-primary" />
            {val === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "choice" && question.choices) {
    return (
      <div className="flex flex-col gap-2">
        {question.choices.map((choice) => (
          <label key={choice} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={question.id}
              value={choice}
              className="accent-primary"
            />
            {choice}
          </label>
        ))}
      </div>
    );
  }
  return null;
}

export default function Interview() {
  const { currentBlockIndex, visibleQuestions, completedBlocks } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const isLastBlock = currentBlockIndex === BLOCKS.length - 1;

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="mt-2 text-sm text-muted-foreground">
            Block {currentBlockIndex + 1} of {BLOCKS.length}
          </p>
          <div className="mt-3 flex gap-1.5 justify-center">
            {BLOCKS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${
                  i < completedBlocks
                    ? "bg-primary"
                    : i === currentBlockIndex
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="mt-4">
            <Link
              to="/preferences"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Start over / re-record preferences
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form method="post" className="space-y-6">
            <input type="hidden" name="block_index" value={currentBlockIndex} />

            {visibleQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label
                  htmlFor={q.id}
                  className="block text-sm font-medium leading-snug"
                >
                  {q.label}
                </label>
                <QuestionField question={q} />
              </div>
            ))}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </span>
              ) : isLastBlock ? (
                "See my matches"
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {completedBlocks >= 1 && (
            <div className="mt-4 text-center">
              <Link
                to="/browse"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Skip remaining questions →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
