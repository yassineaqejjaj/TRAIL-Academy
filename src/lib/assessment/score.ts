import { dimensions, questions, type Dimension, type Question } from "./questions";

export type Level = "beginner" | "intermediate" | "advanced";
export const levelLabel: Record<Level, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export interface DimensionScore { id: Dimension; label: string; correct: number; total: number; percent: number; modules: string[] }
export interface AssessmentResult { correct: number; total: number; percent: number; level: Level; dimensions: DimensionScore[]; weakest: DimensionScore[]; strongest: DimensionScore[]; wrong: Question[] }

/** Thresholds are deliberately simple and explained on the result page. Unanswered questions count as wrong. */
export function levelOf(percent: number): Level {
  return percent >= 75 ? "advanced" : percent >= 45 ? "intermediate" : "beginner";
}

/** `answers` maps a question id to the chosen option index. */
export function scoreAssessment(answers: Record<string, number>, list: Question[] = questions): AssessmentResult {
  const isRight = (q: Question) => answers[q.id] === q.answer;
  const correct = list.filter(isRight).length;
  const percent = list.length ? Math.round((correct / list.length) * 100) : 0;
  const dims: DimensionScore[] = dimensions.map((d) => {
    const qs = list.filter((q) => q.dimension === d.id);
    const ok = qs.filter(isRight).length;
    return { id: d.id, label: d.label, correct: ok, total: qs.length, percent: qs.length ? Math.round((ok / qs.length) * 100) : 0, modules: d.modules };
  }).filter((d) => d.total > 0);
  const sorted = [...dims].sort((a, b) => a.percent - b.percent);
  return {
    correct, total: list.length, percent, level: levelOf(percent), dimensions: dims,
    weakest: sorted.filter((d) => d.percent < 100).slice(0, 2),
    strongest: [...sorted].reverse().filter((d) => d.percent >= 67).slice(0, 2),
    wrong: list.filter((q) => !isRight(q)),
  };
}
