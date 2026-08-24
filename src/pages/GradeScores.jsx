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
      grade: row.valid ? getGrade(row.score, scaleName) : "Invalid",
    }));
    setResults(graded);
    setRawInput("");
  }

  function handleClear() {
    setRawInput("");
    setResults([]);
  }

  function handleCopy() {
    const hasNames = results.some((r) => r.name);
    const header = hasNames ? "Name\tScore\tGrade" : "Score\tGrade";
    const rows = results.map((r) =>
      hasNames ? `${r.name || ""}\t${r.score ?? ""}\t${r.grade}` : `${r.score ?? ""}\t${r.grade}`
    );
    const text = [header, ...rows].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy to clipboard"), 1500);
    });
  }

  function handleDownloadCSV() {
    const hasNames = results.some((r) => r.name);
    const header = hasNames ? "No,Name,Score,Grade" : "No,Score,Grade";
    const rows = results.map((r, i) =>
      hasNames
        ? `${i + 1},"${r.name || ""}",${r.score ?? ""},${r.grade}`
        : `${i + 1},${r.score ?? ""},${r.grade}`
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

  const hasNames = results.some((r) => r.name);

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
            placeholder={"72\n65\n48\n83\n\nor with names:\nTunde, 72\nAda, 65"}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={10}
          />
          <p className="muted small">
            One score per line. Optionally include a name (e.g. "Tunde, 72").
          </p>

          <div className="grade-scores-actions">
            <button className="secondary-btn" onClick={handleClear}>
              Clear
            </button>
            <a href="#graded">
                <button
                className="primary-btn"
                onClick={handleGrade}
                disabled={!rawInput.trim()}
                >
                ⚡ Grade Scores
                </button>
            </a>
          </div>
        </div>

        <div className="grade-scores-panel" id="graded">
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
                    {hasNames && <th>Name</th>}
                    <th>Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      {hasNames && <td>{r.name || "-"}</td>}
                      <td>{r.score ?? "-"}</td>
                      <td>
                        <span className={`grade-badge grade-${r.grade}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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