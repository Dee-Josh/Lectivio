import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ChevronDown } from "lucide-react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import SpinnerFull from "../components/SpinnerFull";
import Spinner from "../components/Spinner";
import CourseQuickLinks from "../components/CourseQuickLinks";
import { useCourseData, studentRates, closedSessions } from "../utils/courseData";
import { normKey } from "../utils/attendance";
import "../attendance.css";
import "../management.css";

const PAGE_SIZE = 40;
const CELL = {
  present: { text: "✓", cls: "att-cell-present" },
  late: { text: "L", cls: "att-cell-late" },
  absent: { text: "✗", cls: "att-cell-absent" },
};

export default function StudentsDirectory() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [openKey, setOpenKey] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

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

  const { loading, data, statusMapFor } = useCourseData(currentUser?.uid, courses);

  // One entry per person (matched by matric number), with a block for each course they're in
  const directory = useMemo(() => {
    const people = new Map();
    courses.forEach((c) => {
      const d = data[c.id];
      if (!d) return;
      const titles = closedSessions(d.sessions).map((s) => ({ title: s.lectureTitle, at: s.startedAt }));
      const policy = c.attendancePolicy || 75;
      studentRates(c.id, d.students, d.sessions, statusMapFor).forEach((r) => {
        if (!r.key) return;
        const person = people.get(r.key) || { key: r.key, name: r.name, matricNumber: r.matricNumber, courses: [] };
        if (!person.name && r.name) person.name = r.name;
        person.courses.push({
          courseId: c.id,
          code: c.courseCode,
          title: c.courseName,
          policy,
          attended: r.attended,
          held: r.held,
          pct: r.pct,
          ready: Boolean(d.sessions), // attendance rates need the sessions to have arrived
          strip: r.strip,
          titles,
        });
        people.set(r.key, person);
      });
    });
    return [...people.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [courses, data, statusMapFor]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const termKey = normKey(search);
    return directory.filter((p) => {
      if (courseFilter !== "all" && !p.courses.some((c) => c.courseId === courseFilter)) return false;
      if (!term) return true;
      return (p.name || "").toLowerCase().includes(term) || (termKey && p.key.includes(termKey));
    });
  }, [directory, search, courseFilter]);

  if (coursesLoading) return <SpinnerFull label="Loading students..." />;

  const anyLoaded = courses.some((c) => data[c.id]?.students);

  const chipClass = (c) => (!c.ready || c.pct === null ? "stu-chip" : c.pct < c.policy ? "stu-chip stu-chip-low" : "stu-chip stu-chip-ok");

  return (
    <AppLayout>
      <div className="courses-title-row">
        <div>
          <h1>Students</h1>
          {/* <p className="muted">Everyone across your courses. Add or import students inside each course.</p> */}
          <p className="muted">Everyone across your courses.</p>
        </div>
        <Link to="/courses" className="secondary-btn">Courses</Link>
      </div>

      <CourseQuickLinks
        title="Manage students by course"
        courses={courses}
        tab="students"
        action="Manage students"
        statLine={(c) => {
          if (!data[c.id]?.students) return "Loading…";
          const n = data[c.id].students.length;
          return `${n} student${n === 1 ? "" : "s"}`;
        }}
      />

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>No courses yet</p>
          <p className="muted">Create a course first, then you can add students to it.</p>
          <Link to="/courses/new" className="primary-btn">Create a course</Link>
        </div>
      ) : (
        <>
          <div className="mgmt-toolbar">
            <input
              className="search-input mgmt-search"
              placeholder="Search by name or matric number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisible(PAGE_SIZE);
              }}
            />
            <select
              className="mgmt-select"
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              aria-label="Filter by course"
            >
              <option value="all">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.courseCode}</option>
              ))}
            </select>
          </div>

          <p className="muted small">
            {filtered.length} student{filtered.length === 1 ? "" : "s"}
            {loading && anyLoaded ? " so far — loading more courses…" : ""}
            {!loading && directory.length === 0 ? " — add students inside a course to see them here." : ""}
          </p>

          {!anyLoaded && <Spinner />}

          <div className="stu-list">
            {filtered.slice(0, visible).map((p) => {
              const open = openKey === p.key;
              return (
                <div className="stu-row" key={p.key}>
                  <button className="stu-row-main" onClick={() => setOpenKey(open ? null : p.key)} aria-expanded={open}>
                    <div className="stu-id">
                      <strong>{p.name}</strong>
                      <span className="muted small">{p.matricNumber}</span>
                    </div>
                    <div className="stu-chips">
                      {p.courses.map((c) => (
                        <span key={c.courseId} className={chipClass(c)}>
                          {c.code} · {!c.ready ? "…" : c.pct === null ? "—" : `${c.pct}%`}
                        </span>
                      ))}
                    </div>
                    <ChevronDown size={16} className={`stu-caret ${open ? "stu-caret-open" : ""}`} />
                  </button>

                  {open && (
                    <div className="stu-detail">
                      {p.courses.map((c) => (
                        <div className="stu-course" key={c.courseId}>
                          <div className="stu-course-head">
                            <strong>{c.code}</strong>
                            <span className="muted small">{c.title}</span>
                          </div>
                          {!c.ready ? (
                            <p className="muted small">Loading attendance…</p>
                          ) : c.held === 0 ? (
                            <p className="muted small">No sessions yet.</p>
                          ) : (
                            <>
                              <div className="stu-bar">
                                <div
                                  className={`stu-bar-fill ${c.pct < c.policy ? "stu-bar-low" : ""}`}
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                              <p className="small">
                                Attended {c.attended} of {c.held} sessions ({c.pct}%)
                                {c.pct < c.policy ? ` · below the ${c.policy}% policy` : ""}
                              </p>
                              <div className="stu-strip">
                                {c.strip.map((st, i) => (
                                  <span
                                    key={i}
                                    className={`att-cell ${st ? CELL[st].cls : ""}`}
                                    title={c.titles[i]?.title}
                                  >
                                    {st ? CELL[st].text : "—"}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                          <Link to={`/courses/${c.courseId}?tab=students`} className="att-link-btn">
                            Open {c.code} students →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {anyLoaded && filtered.length === 0 && directory.length > 0 && <p className="muted">No students match your search.</p>}
          </div>

          {filtered.length > visible && (
            <button className="att-link-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} left)
            </button>
          )}
        </>
      )}
    </AppLayout>
  );
}
