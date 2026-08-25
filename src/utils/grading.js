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

// Parses each line into either:
//  - a single total score ("72")
//  - CA + Exam ("20 45", "20\t45", "20, 45") -> total = CA + Exam
export function parseScores(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const nums = (line.match(/\d+(\.\d+)?/g) || []).map(Number);

    let ca = null;
    let exam = null;
    let total = null;

    if (nums.length >= 2) {
      ca = nums[0];
      exam = nums[1];
      total = ca + exam;
    } else if (nums.length === 1) {
      total = nums[0];
    }

    return {
      id: i,
      ca,
      exam,
      total,
      valid: total !== null && total >= 0 && total <= 100,
    };
  });
}