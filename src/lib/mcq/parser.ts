// MCQ bulk-paste parser
// Supported format (blank line between questions):
//
//   Q: What is 2 + 2?
//   A) 3
//   B) 4 *
//   C) 5
//   D) 6
//   E: Basic arithmetic — sum of two twos.
//   D: easy
//   T: math, arithmetic
//   Y: 2024
//   X: BCA Sem 1 Mid-Term
//
// Rules:
// - "Q:" starts a new question (also accepts "1." / "1)" numbering).
// - Options start with A)/B)/C)/D) or A./B. — trailing "*" marks correct.
// - Multiple options can be marked correct (multi-select question).
// - E: explanation, D: difficulty (easy|medium|hard), T: comma tags,
//   Y: year (int), X: exam name. All optional.

export type ParsedOption = { text: string; is_correct: boolean };
export type ParsedQuestion = {
  prompt: string;
  options: ParsedOption[];
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  year?: number;
  exam_name?: string;
  errors: string[];
};

const OPTION_RE = /^\s*([A-Ha-h])\s*[).\-:]\s*(.+?)\s*$/;
const Q_RE = /^\s*(?:Q\s*[:.)-]|(\d+)\s*[.)])\s*(.+)$/i;

export function parseMcqBulk(input: string): ParsedQuestion[] {
  const trimmed = input.trim();
  // JSON mode — accept an array of question objects, or { questions: [...] }.
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const raw = JSON.parse(trimmed);
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : null;
      if (list) return list.map(normalizeJsonQuestion);
    } catch {
      // fall through to text parser so users see per-block errors
    }
  }

  const blocks = trimmed
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);


  const out: ParsedQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const q: ParsedQuestion = { prompt: "", options: [], errors: [] };
    let inPrompt = false;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      // Meta prefixes
      const meta = /^([EDTYX])\s*[:.\-]\s*(.+)$/i.exec(line);
      if (meta && !OPTION_RE.test(line)) {
        const key = meta[1].toUpperCase();
        const val = meta[2].trim();
        if (key === "E") q.explanation = val;
        else if (key === "D") {
          const d = val.toLowerCase();
          if (d === "easy" || d === "medium" || d === "hard") q.difficulty = d;
        } else if (key === "T") q.tags = val.split(",").map((t) => t.trim()).filter(Boolean);
        else if (key === "Y") { const n = parseInt(val, 10); if (!isNaN(n)) q.year = n; }
        else if (key === "X") q.exam_name = val;
        continue;
      }

      // Option?
      const opt = OPTION_RE.exec(line);
      if (opt && q.prompt) {
        let text = opt[2];
        let is_correct = false;
        if (/\s\*+\s*$/.test(text) || /\*+$/.test(text)) {
          is_correct = true;
          text = text.replace(/\s*\*+\s*$/, "").trim();
        }
        q.options.push({ text, is_correct });
        continue;
      }

      // Question line?
      const qm = Q_RE.exec(line);
      if (qm) {
        q.prompt = (qm[2] ?? "").trim();
        inPrompt = true;
        continue;
      }

      // Continuation of prompt (before options appear)
      if (inPrompt && q.options.length === 0) {
        q.prompt += (q.prompt ? " " : "") + line;
        continue;
      }

      // Fallback: if no explicit Q: prefix and this is the first line, treat as prompt
      if (!q.prompt) {
        q.prompt = line;
        inPrompt = true;
      }
    }

    if (!q.prompt) q.errors.push("Missing question text");
    if (q.options.length < 2) q.errors.push("Need at least 2 options");
    if (q.options.length && !q.options.some((o) => o.is_correct))
      q.errors.push("Mark at least one correct option with * at the end");

    out.push(q);
  }

  return out;
}
