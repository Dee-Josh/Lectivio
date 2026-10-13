// Shared data layer for the cross-course pages (/attendance-management and /students).
// Listens to every course's students + attendance sessions and derives attendance rates.
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { normKey } from "./attendance";

// studentsFor: "all" (default) or an array of course ids whose student lists should be loaded.
// Sessions are small, so they're always loaded for every course; student lists are the expensive part.
export function useCourseData(lecturerId, courses, { studentsFor = "all" } = {}) {
  const [data, setData] = useState({}); // courseId -> { students?, sessions? }
  const [older, setOlder] = useState({}); // "courseId/sessionId" -> { matricKey: status } for sessions closed before statusMap existed
  const fetching = useRef(new Set());
  const courseIds = courses.map((c) => c.id).join(",");
  const studentsKey = studentsFor === "all" ? "all" : [...studentsFor].sort().join(",");

  const put = (courseId, patch) =>
    setData((prev) => ({ ...prev, [courseId]: { ...prev[courseId], ...patch } }));

  // Sessions for every course (kept live)
  useEffect(() => {
    if (!lecturerId || courses.length === 0) {
      setData({});
      return undefined;
    }
    const unsubs = courses.map((c) => {
      const courseRef = doc(db, "lecturers", lecturerId, "courses", c.id);
      return onSnapshot(
        query(collection(courseRef, "attendanceSessions"), orderBy("startedAt", "desc"), limit(200)),
        (snap) => put(c.id, { sessions: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
        (err) => {
          console.error("Load sessions failed:", err);
          put(c.id, { sessions: [] });
        }
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [lecturerId, courseIds]);

  // Student lists only for the courses asked for
  useEffect(() => {
    if (!lecturerId) return undefined;
    const wanted = studentsFor === "all" ? courses : courses.filter((c) => studentsFor.includes(c.id));
    const unsubs = wanted.map((c) => {
      const courseRef = doc(db, "lecturers", lecturerId, "courses", c.id);
      return onSnapshot(
        collection(courseRef, "students"),
        (snap) => put(c.id, { students: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
        (err) => {
          console.error("Load students failed:", err);
          put(c.id, { students: [] });
        }
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [lecturerId, courseIds, studentsKey]);

  // Older closed sessions have no statusMap: read their records once and cache the result
  useEffect(() => {
    const jobs = [];
    Object.entries(data).forEach(([courseId, d]) => {
      (d.sessions || []).forEach((s) => {
        const key = `${courseId}/${s.id}`;
        if (s.status === "closed" && !s.statusMap && !older[key] && !fetching.current.has(key)) {
          fetching.current.add(key);
          jobs.push([courseId, s.id, key]);
        }
      });
    });
    if (jobs.length === 0) return;
    Promise.all(
      jobs.map(async ([courseId, sessionId, key]) => {
        const snap = await getDocs(
          collection(db, "lecturers", lecturerId, "courses", courseId, "attendanceSessions", sessionId, "records")
        );
        const map = {};
        snap.docs.forEach((d) => (map[d.id] = d.data().status));
        return [key, map];
      })
    )
      .then((pairs) => setOlder((prev) => ({ ...prev, ...Object.fromEntries(pairs) })))
      .catch((err) => console.error("Load older sessions failed:", err));
  }, [data]);

  const statusMapFor = useCallback(
    (courseId, session) => session.statusMap || older[`${courseId}/${session.id}`] || {},
    [older]
  );

  const sessionsLoading = courses.some((c) => !data[c.id]?.sessions);
  const loading = courses.some((c) => !data[c.id]?.sessions || (studentsFor === "all" && !data[c.id]?.students));
  return { loading, sessionsLoading, data, statusMapFor };
}

export const closedSessions = (sessions = []) =>
  sessions.filter((s) => s.status === "closed").sort((a, b) => a.startedAt - b.startedAt);

export const liveSessionOf = (sessions = []) => sessions.find((s) => s.status !== "closed") || null;

// One row per student: their status in each closed session, plus attended / held / percent
export function studentRates(courseId, students = [], sessions = [], statusMapFor) {
  const closed = closedSessions(sessions);
  return students.map((s) => {
    const key = s.matricKey || normKey(s.matricNumber);
    const strip = closed.map((sess) => statusMapFor(courseId, sess)[key] || null);
    const attended = strip.filter((x) => x === "present" || x === "late").length;
    const held = strip.filter(Boolean).length; // sessions this student was on the roll for
    return { ...s, key, strip, attended, held, pct: held ? Math.round((attended / held) * 100) : null };
  });
}

export function courseOverview(course, courseData, statusMapFor) {
  const sessions = courseData?.sessions || [];
  const students = courseData?.students || [];
  const closed = closedSessions(sessions);
  const attended = closed.reduce((n, s) => n + (s.summary?.present || 0) + (s.summary?.late || 0), 0);
  const slots = closed.reduce((n, s) => n + (s.summary?.total || 0), 0);
  const policy = course.attendancePolicy || 75;
  const rows = studentRates(course.id, students, sessions, statusMapFor);
  const below = rows.filter((r) => r.pct !== null && r.pct < policy).sort((a, b) => a.pct - b.pct);
  return {
    closed,
    held: closed.length,
    avgRate: slots ? Math.round((attended / slots) * 100) : null,
    studentCount: students.length,
    policy,
    rows,
    below,
    live: liveSessionOf(sessions),
  };
}
