import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { MapPin, Pause, Play, Copy, Check } from "lucide-react";
import { db } from "../firebase";
import Spinner from "./Spinner";
import {
  normKey,
  generateCode,
  getBestPosition,
  formatCountdown,
} from "../utils/attendance";
import "../attendance.css";

export default function AttendanceTab({ course, courseId, lecturerId }) {
  const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);
  const sessionsRef = collection(courseRef, "attendanceSessions");
  const studentsRef = collection(courseRef, "students");

  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const q = query(sessionsRef, orderBy("startedAt", "desc"), limit(15));
    const unsubSessions = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => {
      unsubStudents();
      unsubSessions();
    };
  }, [courseId]);

  const activeSession = sessions.find((s) => s.status !== "closed") || null;
  const history = sessions.filter((s) => s.status === "closed");

  if (loading) return <Spinner />;

  if (activeSession) {
    return (
      <LiveSession
        key={activeSession.id}
        session={activeSession}
        students={students}
        courseRef={courseRef}
        course={course}
      />
    );
  }

  return (
    <>
      <StartSession
        course={course}
        courseId={courseId}
        lecturerId={lecturerId}
        courseRef={courseRef}
        sessionsRef={sessionsRef}
        students={students}
        sessionCount={sessions.length}
      />
      <SessionHistory history={history} />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Start session                                                      */
/* ---------------------------------------------------------------- */

function StartSession({ course, courseId, lecturerId, courseRef, sessionsRef, students, sessionCount }) {
  const [lectureTitle, setLectureTitle] = useState(`Lecture ${sessionCount + 1}`);
  const [radiusM, setRadiusM] = useState(100);
  const [durationMin, setDurationMin] = useState(10);
  const [lateAfterMin, setLateAfterMin] = useState(15);
  const [locationLabel, setLocationLabel] = useState(course.weeklySchedule?.location || "");
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy }
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  async function useCurrentLocation() {
    setLocating(true);
    setLocError("");
    try {
      setCoords(await getBestPosition({ targetAccuracy: 20, maxWaitMs: 10000 }));
    } catch (err) {
      setLocError(
        err.code === "DENIED"
          ? "Location access is blocked. Allow it in your browser settings and try again."
          : "Couldn't get your location. Check that location services are on and try again."
      );
    }
    setLocating(false);
  }

  async function handleStart(e) {
    e.preventDefault();
    if (!coords) {
      setLocError("Set the attendance location first.");
      return;
    }
    if (students.length === 0) {
      setStartError("Add students to this course before starting attendance.");
      return;
    }
    setStarting(true);
    setStartError("");

    try {
      // Students added before attendance existed don't have a matricKey yet — add it.
      const missing = students.filter((s) => !s.matricKey);
      for (let i = 0; i < missing.length; i += 400) {
        const batch = writeBatch(db);
        missing.slice(i, i + 400).forEach((s) =>
          batch.update(doc(courseRef, "students", s.id), { matricKey: normKey(s.matricNumber) })
        );
        await batch.commit();
      }

      const courseKey = normKey(course.courseCode);
      const now = Date.now();
      const sessionRef = doc(sessionsRef);

      // Retry a few times in case the code is already live for another course with the same code
      let started = false;
      for (let attempt = 0; attempt < 4 && !started; attempt++) {
        const code = generateCode();
        const batch = writeBatch(db);
        batch.set(sessionRef, {
          lectureTitle: lectureTitle.trim() || `Lecture ${sessionCount + 1}`,
          status: "active",
          code,
          courseKey,
          startedAt: now,
          endsAt: now + durationMin * 60000,
          lateAfterMinutes: Number(lateAfterMin),
          radiusM: Number(radiusM),
          location: { lat: coords.lat, lng: coords.lng, accuracy: Math.round(coords.accuracy), label: locationLabel },
          createdAt: serverTimestamp(),
        });
        batch.set(doc(db, "attendanceCodes", `${courseKey}_${code}`), {
          lecturerId,
          courseId,
          sessionId: sessionRef.id,
          expiresAt: new Date(now + durationMin * 60000),
        });
        try {
          await batch.commit();
          started = true;
        } catch (err) {
          if (err.code !== "permission-denied") throw err; // collision -> try another code
        }
      }
      if (!started) setStartError("Couldn't generate a unique code. Please try again.");
    } catch (err) {
      console.error("Start attendance failed:", err);
      setStartError("Couldn't start attendance. Check your connection and try again.");
    }
    setStarting(false);
  }

  return (
    <div className="att-start">
      <h3>Start Attendance Session</h3>
      <p className="muted">Set up the session for today's lecture.</p>

      <form onSubmit={handleStart}>
        <label>Lecture</label>
        <input value={lectureTitle} onChange={(e) => setLectureTitle(e.target.value)} />

        <label>Attendance location</label>
        <div className="att-location-box">
          <MapPin size={18} />
          <div className="att-location-text">
            {coords ? (
              <>
                <strong>{locationLabel || "Current location"}</strong>
                <span className="muted small">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)} m
                </span>
              </>
            ) : (
              <span className="muted">Not set — stand in the classroom and tap the button.</span>
            )}
          </div>
          <button type="button" className="secondary-btn" onClick={useCurrentLocation} disabled={locating}>
            {locating ? "Locating..." : coords ? "Update" : "Use my current location"}
          </button>
        </div>
        {locError && <p className="error">{locError}</p>}
        <input
          placeholder="Venue name (optional), e.g. Engineering Lecture Theatre 2"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
        />

        <div className="att-form-row">
          <div>
            <label>Attendance radius</label>
            <select value={radiusM} onChange={(e) => setRadiusM(e.target.value)}>
              {[50, 100, 150, 200, 300].map((m) => (
                <option key={m} value={m}>{m} metres</option>
              ))}
            </select>
          </div>
          <div>
            <label>Duration</label>
            <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {[5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
          <div>
            <label>Mark late after</label>
            <select value={lateAfterMin} onChange={(e) => setLateAfterMin(e.target.value)}>
              <option value={0}>Never</option>
              {[5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
        </div>

        <p className="att-note">
          Students must be within {radiusM} metres of this location to log attendance.
        </p>
        {startError && <p className="error">{startError}</p>}

        <button type="submit" className="primary-btn" disabled={starting}>
          {starting ? "Starting..." : "Start Session"}
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Live session                                                       */
/* ---------------------------------------------------------------- */

function LiveSession({ session, students, courseRef, course }) {
  const sessionRef = doc(courseRef, "attendanceSessions", session.id);
  const codeRef = doc(db, "attendanceCodes", `${session.courseKey}_${session.code}`);

  const [records, setRecords] = useState({});
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(sessionRef, "records"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data()));
      setRecords(map);
    });
    return unsub;
  }, [session.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const paused = session.status === "paused";
  const msLeft = session.endsAt - now;
  const expired = !paused && msLeft <= 0;
  const expiringSoon = !paused && msLeft > 0 && msLeft < 120000;

  const rows = useMemo(
    () =>
      students
        .map((s) => {
          const key = s.matricKey || normKey(s.matricNumber);
          return { ...s, key, record: records[key] || null };
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students, records]
  );

  const present = rows.filter((r) => r.record?.status === "present").length;
  const late = rows.filter((r) => r.record?.status === "late").length;
  const total = rows.length;
  const absent = total - present - late;

  const visibleRows = rows.filter(
    (r) =>
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.matricNumber?.toLowerCase().includes(search.toLowerCase())
  );

  function copyCode() {
    navigator.clipboard?.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function syncCodeExpiry(ms) {
    updateDoc(codeRef, { expiresAt: new Date(ms) }).catch((e) => console.error("code expiry sync:", e));
  }

  function handlePauseResume() {
    if (paused) {
      const newEnd = session.endsAt + (Date.now() - (session.pausedAt || Date.now()));
      updateDoc(sessionRef, { status: "active", endsAt: newEnd, pausedAt: null }).catch(console.error);
      syncCodeExpiry(newEnd);
    } else {
      updateDoc(sessionRef, { status: "paused", pausedAt: Date.now() }).catch(console.error);
    }
  }

  function handleExtend() {
    const base = Math.max(session.endsAt, Date.now());
    const newEnd = base + 5 * 60000;
    updateDoc(sessionRef, { endsAt: newEnd }).catch(console.error);
    syncCodeExpiry(newEnd);
  }

  function setStatus(row, status) {
    const recRef = doc(sessionRef, "records", row.key);
    setDoc(
      recRef,
      {
        matricKey: row.key,
        matricNumber: row.matricNumber,
        name: row.name || null,
        status,
        method: "manual",
        checkedInAt: row.record?.checkedInAt || Date.now(),
      },
      { merge: true }
    ).catch(console.error);
  }

  async function handleClose() {
    if (
      !window.confirm(
        `Close attendance? ${absent} student${absent === 1 ? "" : "s"} who haven't checked in will be marked Absent.`
      )
    )
      return;
    setClosing(true);
    try {
      const unmarked = rows.filter((r) => !r.record);
      for (let i = 0; i < unmarked.length; i += 400) {
        const batch = writeBatch(db);
        unmarked.slice(i, i + 400).forEach((r) =>
          batch.set(doc(sessionRef, "records", r.key), {
            matricKey: r.key,
            matricNumber: r.matricNumber,
            name: r.name || null,
            status: "absent",
            method: "auto",
            checkedInAt: null,
          })
        );
        await batch.commit();
      }
      const batch = writeBatch(db);
      batch.update(sessionRef, {
        status: "closed",
        closedAt: Date.now(),
        summary: { present, late, absent, total },
      });
      batch.delete(codeRef);
      await batch.commit();
    } catch (err) {
      console.error("Close attendance failed:", err);
      window.alert("Couldn't close the session. Check your connection and try again.");
      setClosing(false);
    }
  }

  return (
    <div className="att-live">
      <div className="att-live-header">
        <div>
          <h3>{course.courseCode} – {session.lectureTitle}</h3>
          <p className="muted small">{session.location?.label || "Attendance session"} · {session.radiusM} m radius</p>
        </div>
        <span className={`att-pill ${paused ? "att-pill-paused" : expired ? "att-pill-expired" : "att-pill-live"}`}>
          {paused ? "Paused" : expired ? "Expired" : `Live · ${formatCountdown(msLeft)}`}
        </span>
      </div>

      <div className={`att-code-card ${paused || expired ? "att-code-dim" : ""}`}>
        <p className="att-code-label">Attendance Code</p>
        <div className="att-code-row">
          <span className="att-code">{session.code}</span>
          <button className="secondary-btn" onClick={copyCode} aria-label="Copy code">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="att-code-hint">
          Students go to <strong>lectivio.com/attendance</strong> and enter the course code and this code.
        </p>
        {expiringSoon && <p className="att-warn">Less than 2 minutes left — extend if students are still arriving.</p>}
        {expired && <p className="att-warn">Time is up. Extend the session or close it.</p>}
      </div>

      <div className="stat-grid">
        <div className="stat-card"><p className="stat-label">Present</p><p className="stat-value att-green">{present}</p></div>
        <div className="stat-card"><p className="stat-label">Late</p><p className="stat-value att-amber">{late}</p></div>
        <div className="stat-card"><p className="stat-label">Absent</p><p className="stat-value att-red">{absent}</p></div>
        <div className="stat-card"><p className="stat-label">Total</p><p className="stat-value">{total}</p></div>
      </div>

      <div className="att-controls">
        <button className="secondary-btn" onClick={handlePauseResume}>
          {paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
        </button>
        <button className="secondary-btn" onClick={handleExtend}>Extend +5 min</button>
        <button className="primary-btn" onClick={handleClose} disabled={closing}>
          {closing ? "Closing..." : "Close Session"}
        </button>
      </div>

      <div className="students-header">
        <h4>Live Attendance</h4>
        <input
          className="search-input"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="att-table-wrap">
        <table className="students-table">
          <thead>
            <tr><th>Student</th><th>Matric No.</th><th>Status</th><th>Time</th><th></th></tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const st = r.record?.status;
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.matricNumber}</td>
                  <td>
                    {st ? (
                      <span className={`att-badge att-badge-${st}`}>
                        {st}{r.record.method === "manual" ? " ·manual" : ""}
                      </span>
                    ) : (
                      <span className="muted small">Not yet</span>
                    )}
                  </td>
                  <td className="muted small">
                    {r.record?.checkedInAt
                      ? new Date(r.record.checkedInAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td>
                    <select
                      className="att-row-select"
                      value=""
                      onChange={(e) => e.target.value && setStatus(r, e.target.value)}
                      aria-label={`Change status for ${r.name}`}
                    >
                      <option value="">Mark…</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* History                                                            */
/* ---------------------------------------------------------------- */

function SessionHistory({ history }) {
  if (history.length === 0) return null;
  return (
    <div className="att-history">
      <h4>Recent Sessions</h4>
      <table className="students-table">
        <thead>
          <tr><th>Date</th><th>Lecture</th><th>Attendance</th></tr>
        </thead>
        <tbody>
          {history.map((s) => {
            const attended = (s.summary?.present || 0) + (s.summary?.late || 0);
            const pct = s.summary?.total ? Math.round((attended / s.summary.total) * 100) : 0;
            return (
              <tr key={s.id}>
                <td>{new Date(s.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td>{s.lectureTitle}</td>
                <td>{attended} / {s.summary?.total ?? "—"} ({pct}%)</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
