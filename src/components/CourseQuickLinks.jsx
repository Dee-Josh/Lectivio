import { Link } from "react-router-dom";

// "Open this course's tab" cards, shared by the Attendance and Students pages
export default function CourseQuickLinks({ title, courses, tab, action, statLine }) {
  if (courses.length === 0) return null;
  return (
    <section className="mgmt-section">
      <h3>{title}</h3>
      <div className="course-grid">
        {courses.map((course) => (
          <div className="course-card" key={course.id}>
            <h4>{course.courseName || "Untitled course"}</h4>
            <p className="muted">{course.courseCode || "No course code"}</p>
            <p>{statLine(course)}</p>
            <Link to={`/courses/${course.id}?tab=${tab}`} className="secondary-btn">
              {action} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
