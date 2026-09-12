// Lightweight, offline goal validation. LOIN pushes vague intentions into
// measurable commitments. No AI calls — just common sense heuristics so the
// check stays instant on Android.

export interface GoalCheck {
  specific: boolean;
  /** Short explanation of why the goal was rejected. */
  reason?: string;
  /** A concrete rewrite the user can accept with one tap. */
  suggestion?: string;
}

const VAGUE_TEMPLATES: Record<string, string> = {
  gym: "Complete a 45-minute Chest & Triceps workout — Bench Press 3x8, Incline Dumbbell Press 3x10, Tricep Pushdowns 3x12.",
  workout:
    "Complete a 45-minute Chest & Triceps workout — Bench Press 3x8, Incline Dumbbell Press 3x10, Tricep Pushdowns 3x12.",
  exercise: "Complete a 45-minute full-body workout — Squats 3x10, Rows 3x10, Plank 3x60s.",
  study: "Finish Chapter 4 of Physics. Solve questions 1-20. Review notes afterwards.",
  studying: "Finish Chapter 4 of Physics. Solve questions 1-20. Review notes afterwards.",
  revision: "Revise Chapter 4 notes, then self-test with questions 1-20 without looking.",
  revise: "Revise Chapter 4 notes, then self-test with questions 1-20 without looking.",
  homework: "Finish all 12 questions of today's Maths homework and check every answer.",
  assignment: "Write the full first draft of the assignment — intro, 3 body sections, conclusion.",
  work: "Clear the 8 open tickets in the sprint board and send the end-of-day summary.",
  working: "Clear the 8 open tickets in the sprint board and send the end-of-day summary.",
  coding: "Finish the authentication page, connect the database, push the latest commit.",
  code: "Finish the authentication page, connect the database, push the latest commit.",
  programming: "Finish the authentication page, connect the database, push the latest commit.",
  project: "Complete the homepage redesign — hero, features section, footer — then deploy.",
  reading: "Read pages 40-90 of the book and write 5 lines of notes per chapter.",
  read: "Read pages 40-90 of the book and write 5 lines of notes per chapter.",
  writing: "Write 1500 words of the article — no editing until the count is hit.",
  write: "Write 1500 words of the article — no editing until the count is hit.",
  design: "Complete the homepage redesign in Figma — hero, features, footer.",
  focus: "Name the exact deliverable. Focus is not a task.",
  productive: "Name the exact deliverable. 'Being productive' cannot be verified.",
  something: "Name the exact deliverable. 'Something' cannot be verified.",
  anything: "Name the exact deliverable. 'Anything' cannot be verified.",
};

const MEASURE = /\d/;

export function checkGoal(raw: string): GoalCheck {
  const goal = raw.trim().replace(/\s+/g, " ");
  if (!goal) {
    return { specific: false, reason: "Write down what you will finish." };
  }

  const words = goal.split(" ").filter(Boolean);
  const lower = goal.toLowerCase().replace(/[^a-z\s]/g, "");
  const key = Object.keys(VAGUE_TEMPLATES).find(
    (k) => lower === k || lower === `${k}ing` || lower === `do ${k}` || lower === `${k} time`,
  );

  if (key) {
    return {
      specific: false,
      reason: `"${goal}" cannot be verified. Make it measurable.`,
      suggestion: VAGUE_TEMPLATES[key],
    };
  }

  if (words.length < 4 && !MEASURE.test(goal)) {
    const hint = Object.keys(VAGUE_TEMPLATES).find((k) => lower.includes(k));
    return {
      specific: false,
      reason: "Too vague. Add the amount, the chapter, the count — something you can prove.",
      suggestion: hint ? VAGUE_TEMPLATES[hint] : undefined,
    };
  }

  return { specific: true };
}

export const GOAL_PLACEHOLDERS = [
  "Finish Chapter 4 of Physics and solve exercises 1-20.",
  "Chest & Triceps workout — 45 minutes, no phone between sets.",
  "Complete the homepage redesign and deploy it.",
  "Write 1500 words.",
  "Edit the client's landing page and send it over.",
];
