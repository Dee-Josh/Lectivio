import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ChevronRight } from "lucide-react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import SpinnerFull from "../components/SpinnerFull";
import Spinner from "../components/Spinner";
import CourseQuickLinks from "../components/CourseQuickLinks";
import { useCourseData, courseOverview } from "../utils/courseData";
import "../attendance.css";
import "../management.css";

const SELECTED_KEY = "lectivio_att_course";
const todayName = () => new Date().toLocaleDateString("en-US", { weekday: "long" });
const formatDate = (ms) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function AttendanceManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [pickedId, setPickedId] = useState(() => localStorage.getItem(SELECTED_KEY));

  useEffect(() => {
    if (!currentUser) {
      setCourses([]);
      setCoursesLoading(false);
      return undefined;
    }
    const q = query(collection(db, "lecturers", currentUser.uid, "courses"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCoursesLoading(false);
      },
      (err) => {
        console.error("Unable to load courses:", err);
        setCoursesLoading(false);
      }
    );
  }, [currentUser]);

  // Sessions load for every course (small); student lists only for the selected one
  const [studentsTarget, setStudentsTarget] = useState(null);
  const { sessionsLoading, data, statusMapFor } = useCourseData(currentUser?.uid, courses, {
    studentsFor: studentsTarget ? [studentsTarget] : [],
  });

  const overviews = useMemo(() => {
    const map = {};
    courses.forEach((c) => (map[c.id] = courseOverview(c, data[c.id], statusMapFor)));
    return map;
  }, [courses, data, statusMapFor]);

  // Which course to show: your last pick, else one that's live, else one scheduled today, else the newest
  const defaultId = useMemo(() => {
    if (sessionsLoading || courses.length === 0) return null; // wait until we know which course is live
    const live = courses.find((c) => overviews[c.id]?.live);
    if (live) return live.id;
    const today = courses.find((c) => c.weeklySchedule?.slots?.some((s) => s.day === todayName()));
    return (today || courses[0])?.id || null;
  }, [courses, overviews, sessionsLoading]);

  const selectedId = courses.some((c) => c.id === pickedId) ? pickedId : defaultId;
  const course = courses.find((c) => c.id === selectedId);
  const ov = course ? overviews[course.id] : null;
  const ready = Boolean(course && data[course.id]?.students && data[course.id]?.sessions);

  useEffect(() => {
    if (selectedId) setStudentsTarget(selectedId);
  }, [selectedId]);

  function pick(id) {
    setPickedId(id);
    localStorage.setItem(SELECTED_KEY, id);
  }

  if (coursesLoading) return <SpinnerFull label="Loading attendance..." />;

  const liveCourses = courses.filter((c) => overviews[c.id]?.live);
  const tabLink = (id, extra = "") => `/courses/${id}?tab=attendance${extra}`;

  return (
    <AppLayout>
      <div className="courses-title-row">
        <div>
          <h1>Attendance</h1>
          <p className="muted">Track attendance across your courses.</p>
        </div>
        {course && ov && (
          <Link to={tabLink(course.id)} className="primary-btn">
            {ov.live ? "Open live session" : "+ Start Attendance"}
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No courses yet</p>
          <p className="muted">Create a course first, then you can start taking attendance.</p>
          <Link to="/courses/new" className="primary-btn">Create a course</Link>
        </div>
      ) : (
        <>
          {liveCourses.map((c) => (
            <Link key={c.id} to={tabLink(c.id)} className="mgmt-live-banner">
              <span className="mgmt-live-dot" />
              <span>
                <strong>{c.courseCode}</strong> attendance is {overviews[c.id].live.status === "paused" ? "paused" : "live"}
                {" · "}code {overviews[c.id].live.code}
              </span>
              <span className="mgmt-live-open">Open →</span>
            </Link>
          ))}

          <div className="mgmt-toolbar">
            <label htmlFor="att-course">Course</label>
            <select
              id="att-course"
              className="mgmt-select"
              value={selectedId || ""}
              onChange={(e) => pick(e.target.value)}
              disabled={!selectedId}
            >
              {!selectedId && <option value="">Loading…</option>}
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} – {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {!ready ? (
            <Spinner />
          ) : (
            <>
          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">Attendance Rate</p>
              <p className="stat-value">{ov.avgRate === null ? "—" : `${ov.avgRate}%`}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Sessions Held</p>
              <p className="stat-value">{ov.held}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Students</p>
              <p className="stat-value">{ov.studentCount}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Below {ov.policy}%</p>
              <p className={`stat-value ${ov.below.length ? "att-red" : ""}`}>{ov.held ? ov.below.length : "—"}</p>
            </div>
          </div>

          <div className="mgmt-columns">
            <section className="mgmt-section">
              <div className="att-history-head">
                <h3>Recent Sessions</h3>
                {ov.held > 0 && (
                  <Link to={tabLink(course.id, "&view=matrix")} className="secondary-btn">
                    All Course Attendance
                  </Link>
                )}
              </div>
              {ov.held === 0 ? (
                <p className="muted">No completed sessions yet. Start attendance in your next lecture.</p>
              ) : (
                <div className="att-table-wrap">
                  <table className="students-table">
                    <thead>
                      <tr><th>Date</th><th>Lecture</th><th>Attendance</th><th></th></tr>
                    </thead>
                    <tbody>
                      {[...ov.closed].reverse().slice(0, 6).map((s) => {
                        const attended = (s.summary?.present || 0) + (s.summary?.late || 0);
                        const pct = s.summary?.total ? Math.round((attended / s.summary.total) * 100) : 0;
                        return (
                          <tr
                            key={s.id}
                            className="att-row-click"
                            tabIndex={0}
                            onClick={() => navigate(tabLink(course.id, `&session=${s.id}`))}
                            onKeyDown={(e) => e.key === "Enter" && navigate(tabLink(course.id, `&session=${s.id}`))}
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
              )}
            </section>

            <section className="mgmt-section">
              <h3>Below {ov.policy}% attendance</h3>
              {ov.held === 0 ? (
                <p className="muted">Rates appear after your first session.</p>
              ) : ov.below.length === 0 ? (
                <p className="muted">Everyone is at or above {ov.policy}%. 🎉</p>
              ) : (
                <ul className="mgmt-risk-list">
                  {ov.below.slice(0, 8).map((s) => (
                    <li key={s.key}>
                      <div>
                        <strong>{s.name}</strong>
                        <span className="muted small">{s.matricNumber}</span>
                      </div>
                      <span className="att-red">{s.attended}/{s.held} · {s.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {ov.below.length > 8 && (
                <Link to={tabLink(course.id, "&view=matrix")} className="att-link-btn">
                  See all {ov.below.length} in the course table
                </Link>
              )}
            </section>
          </div>
            </>
          )}

          <CourseQuickLinks
            title="All courses"
            courses={courses}
            tab="attendance"
            action="Open attendance"
            statLine={(c) => {
              if (!data[c.id]?.sessions) return "Loading…";
              const o = overviews[c.id];
              if (o.live) return "Live session in progress";
              if (!o.held) return "No sessions yet";
              return `${o.held} session${o.held === 1 ? "" : "s"} · ${o.avgRate}% average`;
            }}
          />
        </>
      )}
    </AppLayout>
  );
}
