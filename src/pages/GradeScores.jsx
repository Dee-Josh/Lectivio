import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { gradingScales, getGrade, parseScores } from "../utils/grading";

export default function GradeScores() {
  const [scaleName, setScaleName] = useState("Nigerian University (5-point)");
  const [rawInput, setRawInput] = useState("");
  const [results, setResults] = useState([]);
  const [copyLabel, setCopyLabel] = useState("Copy to clipboard");

  function handleGrade() {
    const parsed = parseScores(rawInput);
    const graded = parsed.map((row) => ({
      ...row,
      grade: row.valid ? getGrade(row.total, scaleName) : "Invalid",
    }));
    setResults(graded);
    setRawInput("");
  }

  function handleClear() {
    setRawInput("");
    setResults([]);
  }

  const hasCAExam = results.some((r) => r.ca !== null);
  const validResults = results.filter((r) => r.valid);
  const totalValid = validResults.length;

  const scaleGrades = gradingScales[scaleName].map((band) => band.grade);
  const gradeCounts = scaleGrades.reduce((acc, g) => {
    acc[g] = validResults.filter((r) => r.grade === g).length;
    return acc;
  }, {});

  const failGrade = scaleGrades[scaleGrades.length - 1]; // lowest tier, e.g. "F"
  const failCount = gradeCounts[failGrade] || 0;
  const successCount = totalValid - failCount;
  const successPct = totalValid > 0 ? ((successCount / totalValid) * 100).toFixed(1) : "0.0";
  const failPct = totalValid > 0 ? ((failCount / totalValid) * 100).toFixed(1) : "0.0";

//   COPY WITH NUMBER
//   function handleCopy() {
//     const header = hasCAExam ? "No\tCA\tExam\tTotal\tGrade" : "No\tScore\tGrade";
//     const rows = results.map((r, i) =>
//       hasCAExam
//         ? `${i + 1}\t${r.ca ?? ""}\t${r.exam ?? ""}\t${r.total ?? ""}\t${r.grade}`
//         : `${i + 1}\t${r.total ?? ""}\t${r.grade}`
//     );
//     const text = [header, ...rows].join("\n");

//     navigator.clipboard.writeText(text).then(() => {
//       setCopyLabel("Copied!");
//       setTimeout(() => setCopyLabel("Copy to clipboard"), 1500);
//     });
//   }

//  COPY WITHOUT NUMBER
function handleCopy() {
    const header = hasCAExam ? "CA\tExam\tTotal\tGrade" : "No\tScore\tGrade";
    const rows = results.map((r, i) =>
      hasCAExam
        ? `${r.ca ?? ""}\t${r.exam ?? ""}\t${r.total ?? ""}\t${r.grade}`
        : `${r.total ?? ""}\t${r.grade}`
    );
    // const text = [header, ...rows].join("\n"); // copy with header
    const text = [header, ...rows].join("\n"); // copy without header

    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy to clipboard"), 1500);
    });
  }

  function handleDownloadCSV() {
    const header = hasCAExam ? "No,CA,Exam,Total,Grade" : "No,Score,Grade";
    const rows = results.map((r, i) =>
      hasCAExam
        ? `${i + 1},${r.ca ?? ""},${r.exam ?? ""},${r.total ?? ""},${r.grade}`
        : `${i + 1},${r.total ?? ""},${r.grade}`
    );
    const csvContent = [header, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "graded-scores.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="grade-scores-header">
        <h1>Grade Scores</h1>
        <p className="muted">Paste scores and get grades instantly.</p>
      </div>

      <div className="grade-scores-grid">
        <div className="grade-scores-panel">
          <label className="grade-scores-step-label">
            <span className="step-num">1</span> Select Grading Scale
          </label>
          <select
            className="grade-scale-select"
            value={scaleName}
            onChange={(e) => setScaleName(e.target.value)}
          >
            {Object.keys(gradingScales).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <label className="grade-scores-step-label">
            <span className="step-num">2</span> Paste your scores
          </label>
          <textarea
            className="grade-scores-textarea"
            placeholder={"72\n65\n48\n83\n\nor CA + Exam:\n20 45\n18 50\n25 40"}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={10}
          />
          <p className="muted small">
            One entry per line. Use a single number for a total score, or two
            numbers (CA, Exam) separated by a space, tab, or comma.
          </p>

          <div className="grade-scores-actions">
            <button className="secondary-btn" onClick={handleClear}>
              Clear
            </button>
            <a href="#grade">
                <button id="grade"
                className="primary-btn"
                onClick={handleGrade}
                disabled={!rawInput.trim()}
                >
                ⚡ Grade Scores
                </button>
            </a>
          </div>
        </div>

        <div className="grade-scores-panel">
          <div className="grade-results-header">
            <h3>Graded Results {results.length > 0 && `(${results.length})`}</h3>
          </div>

          {results.length === 0 ? (
            <p className="muted">Paste and grade scores to see results here.</p>
          ) : (
            <>
              <table className="grade-results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {hasCAExam ? (
                      <>
                        <th>CA</th>
                        <th>Exam</th>
                        <th>Total</th>
                      </>
                    ) : (
                      <th>Score</th>
                    )}
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      {hasCAExam ? (
                        <>
                          <td>{r.ca ?? "-"}</td>
                          <td>{r.exam ?? "-"}</td>
                          <td>{r.total ?? "-"}</td>
                        </>
                      ) : (
                        <td>{r.total ?? "-"}</td>
                      )}
                      <td>
                        <span className={`grade-badge grade-${r.grade}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grade-summary">
                <h4>Summary</h4>
                <div className="grade-summary-row">
                  {scaleGrades.map((g) => (
                    <span key={g} className="grade-summary-item">
                      {g} = {gradeCounts[g] || 0}
                    </span>
                  ))}
                  <span className="grade-summary-item total">
                    Total = {totalValid}
                  </span>
                </div>
                <div className="grade-summary-percentages">
                  <p>
                    <strong>Percentage of Success:</strong> {successPct}%
                  </p>
                  <p>
                    <strong>Percentage of Failure:</strong> {failPct}%
                  </p>
                </div>
              </div>

              <div className="grade-export-actions">
                <button className="secondary-btn" onClick={handleCopy}>
                  📋 {copyLabel}
                </button>
                <button className="secondary-btn" onClick={handleDownloadCSV}>
                  ⬇ Download CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}