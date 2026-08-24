export const gradingScales = {
  "Nigerian University (5-point)": [
    { min: 70, grade: "A" },
    { min: 60, grade: "B" },
    { min: 50, grade: "C" },
    { min: 45, grade: "D" },
    { min: 40, grade: "E" },
    { min: 0, grade: "F" },
  ],
  "Standard (A-F)": [
    { min: 90, grade: "A" },
    { min: 80, grade: "B" },
    { min: 70, grade: "C" },
    { min: 60, grade: "D" },
    { min: 0, grade: "F" },
  ],
};

export function getGrade(score, scaleName) {
  const scale = gradingScales[scaleName];
  if (!scale) return "-";
  const found = scale.find((band) => score >= band.min);
  return found ? found.grade : "-";
}

// Parses pasted text into { name, score } rows.
// Supports: "72", "72, Tunde", "Tunde, 72", "Tunde - 72"
export function parseScores(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const parts = line.split(/,|-/).map((p) => p.trim()).filter(Boolean);

    let score = null;
    let name = "";

    for (const part of parts) {
      if (/^\d+(\.\d+)?$/.test(part) && score === null) {
        score = parseFloat(part);
      } else {
        name = name ? `${name} ${part}` : part;
      }
    }

    return {
      id: i,
      name: name || null,
      score: score !== null ? score : null,
      valid: score !== null && score >= 0 && score <= 100,
    };
  });
}