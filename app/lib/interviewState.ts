export type QuestionType = "text" | "number" | "date" | "yesno" | "choice";

export interface Question {
  id: string;
  field: string;
  label: string;
  type: QuestionType;
  choices?: string[];
  placeholder?: string;
}

export interface Block {
  index: number;
  questions: Question[];
}

export interface ProfileSnapshot {
  budget_max?: number | null;
  bedrooms?: number | null;
  move_in_date?: string | null;
  neighborhoods?: string[];
  lifestyle_signals?: Record<string, unknown>;
  extracted_fields?: string[];
  completed_blocks?: number;
}

export interface ProfileUpdate {
  budget_max?: number | null;
  bedrooms?: number | null;
  move_in_date?: string | null;
  neighborhoods?: string[];
  lifestyle_signals?: Record<string, unknown>;
}

export const BLOCKS: Block[] = [
  {
    index: 0,
    questions: [
      {
        id: "budget_max",
        field: "budget_max",
        label: "What is your maximum monthly budget (in ILS)?",
        type: "number",
        placeholder: "e.g. 7000",
      },
      {
        id: "bedrooms",
        field: "bedrooms",
        label: "How many bedrooms do you need?",
        type: "number",
        placeholder: "e.g. 2",
      },
      {
        id: "move_in_date",
        field: "move_in_date",
        label: "When do you need to move in?",
        type: "date",
      },
    ],
  },
  {
    index: 1,
    questions: [
      {
        id: "neighborhoods",
        field: "neighborhoods",
        label: "Which neighborhoods in Tel Aviv interest you? (separate with commas)",
        type: "text",
        placeholder: "e.g. Florentin, Tel Aviv - North",
      },
      {
        id: "street_character",
        field: "lifestyle_signals.street_character",
        label: "Do you prefer quiet residential streets or lively areas with cafes and nightlife?",
        type: "choice",
        choices: ["Quiet & residential", "Lively & social", "No preference"],
      },
      {
        id: "near_beach_or_park",
        field: "lifestyle_signals.near_beach_or_park",
        label: "Is living near a beach or park important to you?",
        type: "yesno",
      },
    ],
  },
  {
    index: 2,
    questions: [
      {
        id: "near_transport",
        field: "lifestyle_signals.near_transport",
        label: "How important is easy access to public transport?",
        type: "choice",
        choices: ["Very important", "Nice to have", "Not important"],
      },
      {
        id: "near_school",
        field: "lifestyle_signals.near_school",
        label: "Do you need to be near a school?",
        type: "yesno",
      },
      {
        id: "near_religious",
        field: "lifestyle_signals.near_religious",
        label: "Is proximity to a synagogue or religious facility important?",
        type: "yesno",
      },
    ],
  },
  {
    index: 3,
    questions: [
      {
        id: "pets",
        field: "lifestyle_signals.pets",
        label: "Do you have pets?",
        type: "yesno",
      },
      {
        id: "parking",
        field: "lifestyle_signals.parking",
        label: "Do you need parking?",
        type: "yesno",
      },
      {
        id: "wfh",
        field: "lifestyle_signals.wfh",
        label: "Do you work from home and need a quiet space or extra room?",
        type: "yesno",
      },
    ],
  },
  {
    index: 4,
    questions: [
      {
        id: "hebrew_landlord_ok",
        field: "lifestyle_signals.hebrew_landlord_ok",
        label: "Would you be comfortable with a Hebrew-only speaking landlord?",
        type: "yesno",
      },
      {
        id: "furnished",
        field: "lifestyle_signals.furnished",
        label: "Do you need a furnished apartment?",
        type: "choice",
        choices: ["Furnished", "Unfurnished", "Either"],
      },
      {
        id: "min_lease_months",
        field: "lifestyle_signals.min_lease_months",
        label: "What is the minimum lease length you would consider (in months)?",
        type: "number",
        placeholder: "e.g. 12",
      },
    ],
  },
];

export function isFieldFilled(
  field: string,
  extractedFields: string[],
  lifestyleSignals: Record<string, unknown>
): boolean {
  if (field.startsWith("lifestyle_signals.")) {
    const key = field.slice("lifestyle_signals.".length);
    return key in lifestyleSignals && lifestyleSignals[key] !== null && lifestyleSignals[key] !== undefined;
  }
  return extractedFields.includes(field);
}

export function getVisibleQuestionsForBlock(
  block: Block,
  extractedFields: string[],
  lifestyleSignals: Record<string, unknown>
): Question[] {
  return block.questions.filter(
    (q) => !isFieldFilled(q.field, extractedFields, lifestyleSignals)
  );
}

export function getEffectiveCompletedBlocks(
  completedBlocks: number,
  extractedFields: string[],
  lifestyleSignals: Record<string, unknown>
): number {
  let effective = completedBlocks;
  while (effective < BLOCKS.length) {
    const visible = getVisibleQuestionsForBlock(BLOCKS[effective], extractedFields, lifestyleSignals);
    if (visible.length > 0) break;
    effective++;
  }
  return effective;
}

export function getCurrentBlock(
  completedBlocks: number,
  extractedFields: string[],
  lifestyleSignals: Record<string, unknown>
): Block | null {
  const effective = getEffectiveCompletedBlocks(completedBlocks, extractedFields, lifestyleSignals);
  return effective < BLOCKS.length ? BLOCKS[effective] : null;
}

export function mergeAnswers(
  profile: ProfileSnapshot,
  answers: Record<string, string>,
  block: Block
): ProfileUpdate {
  const extractedFields = profile.extracted_fields ?? [];
  const existingSignals = profile.lifestyle_signals ?? {};
  const newSignals: Record<string, unknown> = { ...existingSignals };
  let hasSignalUpdate = false;
  const update: ProfileUpdate = {};

  for (const question of block.questions) {
    const value = answers[question.id];
    if (value === undefined || value === "") continue;
    if (isFieldFilled(question.field, extractedFields, existingSignals)) continue;

    if (question.field.startsWith("lifestyle_signals.")) {
      const key = question.field.slice("lifestyle_signals.".length);
      newSignals[key] = parseQuestionValue(value, question.type);
      hasSignalUpdate = true;
    } else if (question.field === "budget_max" || question.field === "bedrooms") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) {
        if (question.field === "budget_max") update.budget_max = n;
        else update.bedrooms = n;
      }
    } else if (question.field === "move_in_date") {
      update.move_in_date = value;
    } else if (question.field === "neighborhoods") {
      update.neighborhoods = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  if (hasSignalUpdate) {
    update.lifestyle_signals = newSignals;
  }

  return update;
}

function parseQuestionValue(value: string, type: QuestionType): unknown {
  if (type === "yesno") return value === "yes";
  if (type === "number") {
    const n = parseInt(value, 10);
    return isNaN(n) ? null : n;
  }
  return value;
}
