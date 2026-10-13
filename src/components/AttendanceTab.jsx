import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { MapPin, Pause, Play, Copy, Check, ArrowLeft, ChevronRight, Download } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(() => {
    // deep links from the Attendance overview page
    if (searchParams.get("session")) return { name: "session", id: searchParams.get("session") };
    if (searchParams.get("view") === "matrix") return { name: "matrix" };
    return { name: "home" };
  }); // home | session | matrix

  useEffect(() => {
    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const q = query(sessionsRef, orderBy("startedAt", "desc"), limit(200));
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

  if (view.name === "session") {
    const picked = history.find((x) => x.id === view.id);
    if (picked) {
      return (
        <SessionDetail
          key={picked.id}
          session={picked}
          courseRef={courseRef}
          course={course}
          onBack={() => setView({ name: "home" })}
        />
      );
    }
  }

  if (view.name === "matrix") {
    return (
      <CourseMatrix
        history={history}
        students={students}
        courseRef={courseRef}
        course={course}
        onBack={() => setView({ name: "home" })}
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
      <SessionHistory
        history={history}
        onOpen={(id) => setView({ name: "session", id })}
        onMatrix={() => setView({ name: "matrix" })}
      />
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
      const statusMap = {};
      rows.forEach((r) => {
        statusMap[r.key] = r.record?.status || "absent";
      });
      const batch = writeBatch(db);
      batch.update(sessionRef, {
        status: "closed",
        closedAt: Date.now(),
        summary: { present, late, absent, total },
        statusMap,
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

function SessionHistory({ history, onOpen, onMatrix }) {
  const [showAll, setShowAll] = useState(false);
  if (history.length === 0) return null;
  const visible = showAll ? history : history.slice(0, 8);

  return (
    <div className="att-history">
      <div className="att-history-head">
        <h4>Recent Sessions</h4>
        <button className="primary-btn" onClick={onMatrix}>All Course Attendance</button>
      </div>
      <p className="muted small">Tap a session to see who was present and absent.</p>
      <div className="att-table-wrap">
        <table className="students-table att-history-table">
          <thead>
            <tr><th>Date</th><th>Lecture</th><th>Attendance</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const attended = (s.summary?.present || 0) + (s.summary?.late || 0);
              const pct = s.summary?.total ? Math.round((attended / s.summary.total) * 100) : 0;
              return (
                <tr
                  key={s.id}
                  className="att-row-click"
                  tabIndex={0}
                  onClick={() => onOpen(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(s.id)}
                >
                  <td>{formatDate(s.startedAt)}</td>
                  <td>{s.lectureTitle}</td>
                  <td>{attended} / {s.summary?.total ?? "—"} ({pct}%)</td>
                  <td><ChevronRight size={16} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {history.length > 8 && (
        <button className="att-link-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${history.length} sessions`}
        </button>
      )}
    </div>
  );
}

function formatDate(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------------------------------------------------------------- */
/* One past session: who was present / late / absent                   */
/* ---------------------------------------------------------------- */

function SessionDetail({ session, courseRef, course, onBack }) {
  const [records, setRecords] = useState(null); // null = loading
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(courseRef, "attendanceSessions", session.id, "records"))
      .then((snap) => {
        if (!cancelled) setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((err) => {
        console.error("Load session records failed:", err);
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  if (records === null) return <Spinner />;

  const count = (st) => records.filter((r) => r.status === st).length;
  const counts = { present: count("present"), late: count("late"), absent: count("absent") };

  const shown = records
    .filter((r) => filter === "all" || r.status === filter)
    .filter(
      (r) =>
        !search ||
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.matricNumber?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const chips = [
    ["all", `All (${records.length})`],
    ["present", `Present (${counts.present})`],
    ["late", `Late (${counts.late})`],
    ["absent", `Absent (${counts.absent})`],
  ];

  return (
    <div className="att-detail">
      <button className="att-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to attendance
      </button>

      <h3>{course.courseCode} – {session.lectureTitle}</h3>
      <p className="muted small">
        {formatDate(session.startedAt)}
        {session.location?.label ? ` · ${session.location.label}` : ""}
      </p>

      <div className="stat-grid">
        <div className="stat-card"><p className="stat-label">Present</p><p className="stat-value att-green">{counts.present}</p></div>
        <div className="stat-card"><p className="stat-label">Late</p><p className="stat-value att-amber">{counts.late}</p></div>
        <div className="stat-card"><p className="stat-label">Absent</p><p className="stat-value att-red">{counts.absent}</p></div>
        <div className="stat-card"><p className="stat-label">Total</p><p className="stat-value">{records.length}</p></div>
      </div>

      <div className="att-chips">
        {chips.map(([key, label]) => (
          <button
            key={key}
            className={`att-chip ${filter === key ? "att-chip-active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        className="search-input att-detail-search"
        placeholder="Search students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="att-table-wrap">
        <table className="students-table">
          <thead>
            <tr><th>Student</th><th>Matric No.</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={4} className="muted">No students to show.</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.matricNumber}</td>
                <td>
                  <span className={`att-badge att-badge-${r.status}`}>
                    {r.status}{r.method === "manual" ? " ·manual" : ""}
                  </span>
                </td>
                <td className="muted small">
                  {r.checkedInAt
                    ? new Date(r.checkedInAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* All course attendance: students x sessions                          */
/* ---------------------------------------------------------------- */

const CELL = {
  present: { text: "✓", cls: "att-cell-present" },
  late: { text: "L", cls: "att-cell-late" },
  absent: { text: "✗", cls: "att-cell-absent" },
};

function CourseMatrix({ history, students, courseRef, course, onBack }) {
  // oldest first, so Lecture 1 is the first column
  const sessions = useMemo(
    () => [...history].sort((a, b) => a.startedAt - b.startedAt),
    [history]
  );
  const [older, setOlder] = useState({}); // sessionId -> { matricKey: status } for sessions closed before statusMap existed

  useEffect(() => {
    const missing = sessions.filter((s) => !s.statusMap && !older[s.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (s) => {
        const snap = await getDocs(collection(courseRef, "attendanceSessions", s.id, "records"));
        const map = {};
        snap.docs.forEach((d) => (map[d.id] = d.data().status));
        return [s.id, map];
      })
    )
      .then((pairs) => {
        if (!cancelled) setOlder((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
      })
      .catch((err) => console.error("Load older sessions failed:", err));
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  const rows = useMemo(
    () =>
      students
        .map((s) => {
          const key = s.matricKey || normKey(s.matricNumber);
          const cells = sessions.map((sess) => (sess.statusMap || older[sess.id] || {})[key] || null);
          const attended = cells.filter((c) => c === "present" || c === "late").length;
          const held = cells.filter(Boolean).length; // sessions this student was on the roll for
          return { ...s, key, cells, attended, held };
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students, sessions, older]
  );

  function downloadCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Name", "Matric Number", ...sessions.map((s) => s.lectureTitle), "Attended", "Held", "Attendance %"];
    const lines = [header.map(esc).join(",")];
    rows.forEach((r) => {
      const cells = r.cells.map((c) => (c ? c[0].toUpperCase() + c.slice(1) : ""));
      const attendancePercent = r.held > 0 ? `${Math.round((r.attended / r.held) * 100)}%` : "N/A";
      lines.push([r.name, r.matricNumber, ...cells, r.attended, r.held, attendancePercent].map(esc).join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.courseCode || "course"}-attendance.csv`.replace(/\s+/g, "");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="att-detail">
      <button className="att-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to attendance
      </button>

      <div className="att-history-head">
        <h3>{course.courseCode} – All Course Attendance</h3>
        {sessions.length > 0 && students.length > 0 && (
          <button className="secondary-btn" onClick={downloadCsv}>
            <Download size={14} /> Download CSV
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="muted">No completed sessions yet. Close a session and it will appear here.</p>
      ) : (
        <>
          <p className="muted small">
            <span className="att-cell att-cell-present">✓</span> Present{"  "}
            <span className="att-cell att-cell-late">L</span> Late{"  "}
            <span className="att-cell att-cell-absent">✗</span> Absent{"  "}
            <span className="att-cell">—</span> Not on the class list then
          </p>
          <div className="att-table-wrap">
            <table className="att-matrix">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Matric No.</th>
                  {sessions.map((s) => (
                    <th key={s.id} className="att-matrix-col">
                      {s.lectureTitle}
                      <small>{new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.matricNumber}</td>
                    {r.cells.map((c, i) => (
                      <td key={sessions[i].id} className={`att-cell ${c ? CELL[c].cls : ""}`}>
                        {c ? CELL[c].text : "—"}
                      </td>
                    ))}
                    <td className="att-matrix-total">
                      {r.attended}/{r.held}
                      {r.held > 0 && <small> {Math.round((r.attended / r.held) * 100)}%</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
