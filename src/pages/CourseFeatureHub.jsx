import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import SpinnerFull from "../components/SpinnerFull";

const PAGE_CONFIG = {
  students: {
    title: "Students",
    description: "Choose a course to view, add, import, or manage its students.",
    action: "Manage students",
    tab: "students",
    emptyTitle: "No courses yet",
    emptyDescription: "Create a course first, then you can add students to it.",
  },
  attendance: {
    title: "Attendance",
    description: "Choose a course to start a session or review attendance history and course percentages.",
    action: "Open attendance",
    tab: "attendance",
    emptyTitle: "No courses yet",
    emptyDescription: "Create a course first, then you can start taking attendance.",
  },
};

export default function CourseFeatureHub({ mode }) {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = PAGE_CONFIG[mode] || PAGE_CONFIG.students;

  useEffect(() => {
    if (!currentUser) {
      setCourses([]);
      setLoading(false);
      return undefined;
    }

    const coursesRef = collection(db, "lecturers", currentUser.uid, "courses");
    const coursesQuery = query(coursesRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      coursesQuery,
      (snapshot) => {
        setCourses(snapshot.docs.map((courseDoc) => ({ id: courseDoc.id, ...courseDoc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(`Unable to load courses for ${mode}:`, error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, mode]);

  if (loading) return <SpinnerFull label="Loading courses..." />;

  return (
    <AppLayout>
      <div className="courses-title-row">
        <div>
          <h1>{config.title}</h1>
          <p className="muted">{config.description}</p>
        </div>
        <Link to="/courses" className="secondary-btn">View courses</Link>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>{config.emptyTitle}</p>
          <p className="muted">{config.emptyDescription}</p>
          <Link to="/courses/new" className="primary-btn">Create a course</Link>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <div className="course-card" key={course.id}>
              <h4>{course.courseName || "Untitled course"}</h4>
              <p className="muted">{course.courseCode || "No course code"}</p>
              <p>{course.sessionLabel || "No semester specified"}</p>
              <Link to={`/courses/${course.id}?tab=${config.tab}`} className="secondary-btn">
                {config.action} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
