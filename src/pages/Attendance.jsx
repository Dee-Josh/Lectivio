import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, MapPin } from "lucide-react";
import {
  FUNCTIONS_URL,
  CHECKIN_ERRORS,
  getBestPosition,
  getDeviceId,
} from "../utils/attendance";
import "../attendance.css";

// Public page: lectivio.com/attendance — no login. Optional prefill: ?c=MEE504&k=74291
export default function Attendance() {
  const [params] = useSearchParams();
  const [matric, setMatric] = useState(localStorage.getItem("lectivio_matric") || "");
  const [courseCode, setCourseCode] = useState(params.get("c") || localStorage.getItem("lectivio_course") || "");
  const [code, setCode] = useState(params.get("k") || "");

  // form | locating | submitting | success | error
  const [phase, setPhase] = useState("form");
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!matric.trim() || !courseCode.trim() || !/^\d{5}$/.test(code.trim())) {
      setResult({ error: "BAD_REQUEST" });
      setPhase("error");
      return;
    }

    localStorage.setItem("lectivio_matric", matric.trim());
    localStorage.setItem("lectivio_course", courseCode.trim());

    setPhase("locating");
    let position;
    try {
      position = await getBestPosition();
    } catch (err) {
      setResult({ error: err.code === "DENIED" ? "LOCATION_DENIED" : "LOCATION_UNAVAILABLE" });
      setPhase("error");
      return;
    }

    setPhase("submitting");
    try {
      const res = await fetch(`${FUNCTIONS_URL}/attendance-check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matric: matric.trim(),
          courseCode: courseCode.trim(),
          code: code.trim(),
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
          deviceId: getDeviceId(),
        }),
      });
      const data = await res.json();
      setResult(data);
      setPhase(data.ok ? "success" : "error");
    } catch {
      setResult({ error: "NETWORK" });
      setPhase("error");
    }
  }

  function reset(clearCode = false) {
    if (clearCode) setCode("");
    setResult(null);
    setPhase("form");
  }

  return (
    <div className="att-public">
      <div className="att-public-card">
        <div className="att-public-logo">
          <img src="/lectivio-logo.png" alt="" />
          <span>Lectivio</span>
        </div>

        {(phase === "form" || phase === "locating" || phase === "submitting") && (
          <>
            <h2>Mark Attendance</h2>
            <p className="muted">Enter the details below to log your attendance.</p>

            <form onSubmit={handleSubmit}>
              <label>Matric Number</label>
              <input
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                placeholder="e.g. ME/21/1234"
                autoCapitalize="characters"
                autoComplete="off"
                disabled={phase !== "form"}
              />
              <label>Course Code</label>
              <input
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. MEE 504"
                autoCapitalize="characters"
                autoComplete="off"
                disabled={phase !== "form"}
              />
              <label>Attendance Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g. 74291"
                inputMode="numeric"
                autoComplete="off"
                disabled={phase !== "form"}
              />
              <button type="submit" className="primary-btn" disabled={phase !== "form"}>
                {phase === "locating"
                  ? "Getting your location..."
                  : phase === "submitting"
                  ? "Verifying..."
                  : "Log Attendance"}
              </button>
            </form>

            <p className="att-public-note">
              <MapPin size={14} /> Location verification required. You'll be asked to allow location access
              when you tap the button.
            </p>
          </>
        )}

        {phase === "success" && result && (
          <div className="att-result att-result-ok">
            <CheckCircle2 size={64} />
            <h2>Attendance Recorded!</h2>
            <p>You're marked {result.status === "late" ? "late" : "present"} for</p>
            <p className="att-result-course">{result.courseCode} – {result.courseName}</p>
            {result.lectureTitle && <p className="muted">{result.lectureTitle}</p>}
            <div className="att-result-details">
              <div><span>Matric Number</span><strong>{result.matricNumber}</strong></div>
              <div>
                <span>Time</span>
                <strong>{new Date(result.checkedInAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>
              </div>
              <div><span>Location</span><strong>Within range ✓</strong></div>
            </div>
            <button className="primary-btn att-done-btn" onClick={() => reset(true)}>Done</button>
          </div>
        )}

        {phase === "error" && result && <ErrorScreen result={result} onRetry={() => reset(false)} onDone={() => reset(true)} />}

        <p className="att-public-footer">Lectivio · Learning. Progress. Together.</p>
      </div>
    </div>
  );
}

function ErrorScreen({ result, onRetry, onDone }) {
  const info = CHECKIN_ERRORS[result.error] || CHECKIN_ERRORS.SERVER_ERROR;
  // "Already recorded" is good news, not a failure
  const friendly = result.error === "ALREADY_RECORDED";

  return (
    <div className={`att-result ${friendly ? "att-result-ok" : "att-result-fail"}`}>
      {friendly ? <CheckCircle2 size={64} /> : <XCircle size={64} />}
      <h2>{info.title}</h2>
      <p>{info.message}</p>

      {result.error === "OUTSIDE_RANGE" && (
        <div className="att-result-details">
          <div><span>Distance from classroom</span><strong>{result.distanceM?.toLocaleString()} m</strong></div>
          <div><span>Allowed radius</span><strong>{result.radiusM} m</strong></div>
        </div>
      )}
      {result.error === "LOW_ACCURACY" && result.accuracyM && (
        <p className="muted small">Your device reported ±{result.accuracyM} m. We need ±50 m or better.</p>
      )}

      {info.retry ? (
        <button className="primary-btn att-done-btn" onClick={onRetry}>Try Again</button>
      ) : (
        <button className="secondary-btn att-done-btn" onClick={onDone}>Close</button>
      )}
    </div>
  );
}
