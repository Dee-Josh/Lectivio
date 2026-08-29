import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import SpinnerFull from "../components/SpinnerFull";
import { getNextLectureDate, formatLectureDate } from "../utils/schedule";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);


  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }


  useEffect(() => {
    if (!currentUser) return;

    const coursesRef = collection(db, "lecturers", currentUser.uid, "courses");
    const q = query(coursesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  if (loading) return <SpinnerFull label="Loading..." />;

  const totalCourses = courses.length;
  // const totalStudents = courses.reduce(
  //   (sum, c) => sum + (c.expectedCount || 0),
  //   0
  // );
  const totalStudents = courses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const recentCourses = courses.slice(0, 3);
  const upcomingLectures = courses
  .map((course) => {
    const nextDate = getNextLectureDate(course.weeklySchedule);
    if (!nextDate) return null;
    return {
      courseId: course.id,
      courseName: course.courseName,
      courseCode: course.courseCode,
      date: nextDate,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.date - b.date)
  .slice(0, 3);

  return (
    <AppLayout>
      <header className="dashboard-topbar">
        <div>
          <h1>{getGreeting()}, {currentUser?.displayName?.split(" ")[0] || "there"} 👋</h1>
          <p className="muted">Here's what's happening in your classes today.</p>
        </div>
        {/* <button onClick={() => signOut(auth)} className="secondary-btn">
          Log out
        </button> */}
      </header>

      {totalCourses === 0 ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">My Courses</p>
              <p className="stat-value">0</p>
              <p className="stat-sub">Active courses</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Total Students</p>
              <p className="stat-value">0</p>
              <p className="stat-sub">Across all courses</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Pending Assessments</p>
              <p className="stat-value">—</p>
              <p className="stat-sub">Coming soon</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Average Class Score</p>
              <p className="stat-value">—</p>
              <p className="stat-sub">Coming soon</p>
            </div>
          </div>

          <div className="empty-state">
            <p>You don't have any courses yet</p>
            <p className="muted">Create your first course to get started.</p>
            <Link to="/courses/new" className="primary-btn">
              Create your first course
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">My Courses</p>
              <p className="stat-value">{totalCourses}</p>
              <p className="stat-sub">Active courses</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Total Students</p>
              <p className="stat-value">{totalStudents}</p>
              <p className="stat-sub">Across all courses</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Pending Assessments</p>
              <p className="stat-value">—</p>
              <p className="stat-sub">Coming soon</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Average Class Score</p>
              <p className="stat-value">—</p>
              <p className="stat-sub">Coming soon</p>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-panel">
              <h3>Recent Courses</h3>
              {recentCourses.map((course) => (
                <div className="recent-course-row" key={course.id}>
                  <div>
                    <p className="recent-course-name">{course.courseName}</p>
                    <p className="muted small">{course.courseCode}</p>
                  </div>
                  <p className="muted small">{course.studentCount || 0} students</p>
                </div>
              ))}
              <Link to="/courses" className="view-all-link">
                View all courses →
              </Link>
            </div>

            {/* <div className="dashboard-panel">
              <h3>Class Performance Overview</h3>
              <p className="muted">Coming soon — once Attendance and Assessments are live.</p>
            </div> */}

            <div className="dashboard-panel">
              <h3>Upcoming Lectures</h3>
              {upcomingLectures.length === 0 ? (
                <p className="muted">No lectures scheduled yet. Set a weekly schedule from any course's Overview tab.</p>
              ) : (
                <div className="upcoming-lecture-list">
                  {upcomingLectures.map((lec) => (
                    <Link
                      to={`/courses/${lec.courseId}`}
                      className="upcoming-lecture-row"
                      key={lec.courseId + lec.date}
                    >
                      <div>
                        <p className="upcoming-lecture-course">{lec.courseName}</p>
                        <p className="muted small">{lec.courseCode}</p>
                      </div>
                      <p className="upcoming-lecture-time">{formatLectureDate(lec.date)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}