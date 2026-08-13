import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import Spinner from "../components/Spinner";

export default function Courses() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Spinner label="Loading..." />;

  return (
    <AppLayout>
      <div className="courses-title-row">
        <h1>Courses</h1>
        {courses.length > 0 && (
          <Link to="/courses/new" className="primary-btn">
            + Create Course
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any courses yet</p>
          <p className="muted">Create your first course to get started.</p>
          <Link to="/courses/new" className="primary-btn">
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <div className="course-card" key={course.id}>
              <h4>{course.courseName}</h4>
              <p className="muted">{course.courseCode}</p>
              <p>{course.sessionLabel}</p>
              <Link to={`/courses/${course.id}`} className="secondary-btn">
                Open Course →
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}