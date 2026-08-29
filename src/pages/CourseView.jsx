import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
// import { doc, onSnapshot } from "firebase/firestore";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import StudentsTab from "../components/StudentsTab";
// import { updateDoc, deleteDoc } from "firebase/firestore";
import SpinnerFull from "../components/SpinnerFull";
import MaterialsTab from "../components/MaterialsTab";
import OverviewTab from "../components/OverviewTab";

export default function CourseView() {
  const { courseId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSession, setEditSession] = useState("");
  const [editPolicy, setEditPolicy] = useState(75);

  function openEditCourse() {
    setEditName(course.courseName);
    setEditCode(course.courseCode);
    setEditSession(course.sessionLabel);
    setEditPolicy(course.attendancePolicy || 75);
    setShowEditCourse(true);
  }

  async function handleEditCourseSave(e) {
    e.preventDefault();
    const courseRef = doc(db, "lecturers", currentUser.uid, "courses", courseId);
    await updateDoc(courseRef, {
      courseName: editName,
      courseCode: editCode,
      sessionLabel: editSession,
      attendancePolicy: Number(editPolicy),
    });
    setShowEditCourse(false);
  }

  function handleDeleteCourse() {
    if (
      !window.confirm(
        "Delete this course and all its students? This can't be undone."
      )
    )
      return;

    const courseRef = doc(db, "lecturers", currentUser.uid, "courses", courseId);

    deleteDoc(courseRef).catch((err) => {
      console.error("Background sync failed (delete course):", err);
    });

    navigate("/courses");
  }

  useEffect(() => {
    if (!currentUser) return;

    const courseRef = doc(db, "lecturers", currentUser.uid, "courses", courseId);
    const unsubscribe = onSnapshot(courseRef, (snap) => {
      if (snap.exists()) {
        setCourse({ id: snap.id, ...snap.data() });
      } else {
        setCourse(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser, courseId]);

  if (loading) return <SpinnerFull label="Loading..." />;
  if (!course) return <p>Course not found.</p>; //design course not found div later

  return (
    <div className="course-view">
      <Link to="/courses" className="back-link">← Back to Courses</Link>

      <div className="course-view-header">
        <div>
          <h1>{course.courseName} ({course.courseCode})</h1>
          <p className="muted">{course.sessionLabel}</p>
        </div>
        <div className="action-buttons">
          <button onClick={openEditCourse} className="secondary-btn">Edit Course</button>
          <button onClick={handleDeleteCourse} className="secondary-btn danger">Delete Course</button>
        </div>
      </div>      

      <div className="tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "materials" ? "active" : ""}
          onClick={() => setActiveTab("materials")}
        >
          Materials
        </button>
        <button
          className={activeTab === "students" ? "active" : ""}
          onClick={() => setActiveTab("students")}
        >
          Students
        </button>
        <button
          className={activeTab === "attendance" ? "active" : ""}
          onClick={() => setActiveTab("attendance")}
        >
          Attendance
        </button>
        <button
          className={activeTab === "assessments" ? "active" : ""}
          onClick={() => setActiveTab("assessments")}
        >
          Assessments
        </button>
        <button
          className={activeTab === "insights" ? "active" : ""}
          onClick={() => setActiveTab("insights")}
        >
          Insights
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "overview" && (
          <OverviewTab onNavigate={setActiveTab} course={course} courseId={courseId} lecturerId={currentUser.uid} />
        )}
        {activeTab === "materials" && (
          <MaterialsTab courseId={courseId} lecturerId={currentUser.uid} />
        )}

        {activeTab === "students" && (
          <StudentsTab courseId={courseId} lecturerId={currentUser.uid} />
        )}
        {activeTab === "attendance" && <p>Attendance coming soon (Phase 2).</p>}
        {activeTab === "assessments" && <p>Assessments coming soon (Phase 3).</p>}
        {activeTab === "insights" && <p>Insights coming soon (Phase 4).</p>}
      </div>

      {/* Added when I need delete and edit courses */}
      {showEditCourse && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Course</h3>
            <form onSubmit={handleEditCourseSave}>
              <label>Course name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              <label>Course code</label>
              <input value={editCode} onChange={(e) => setEditCode(e.target.value)} required />
              <label>Session / Semester</label>
              <input value={editSession} onChange={(e) => setEditSession(e.target.value)} required />
              <label>Minimum attendance policy (%)</label>
              <input
                type="number"
                value={editPolicy}
                onChange={(e) => setEditPolicy(e.target.value)}
                min="0"
                max="100"
              />
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditCourse(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}      
    </div>
  );
}