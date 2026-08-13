import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function CreateCourse() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [expectedCount, setExpectedCount] = useState("");
  const [attendancePolicy, setAttendancePolicy] = useState(75);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const coursesRef = collection(db, "lecturers", currentUser.uid, "courses");
    const newDocRef = doc(coursesRef);

    setDoc(newDocRef, {
      courseName,
      courseCode,
      sessionLabel,
      expectedCount: expectedCount ? Number(expectedCount) : null,
      attendancePolicy: Number(attendancePolicy),
      studentCount: 0,
      createdAt: serverTimestamp(),
    }).catch((err) => {
      console.error("Background sync failed (create course):", err);
    });

    setTimeout(() => {
      navigate(`/courses/${newDocRef.id}`);
    }, 400);
  }

  return (
    <div className="create-course-page">
      <h1>Create New Course</h1>
      <form onSubmit={handleCreate}>
        <label>Course name</label>
        <input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Fluid Mechanics"
          required
        />

        <label>Course code</label>
        <input
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          placeholder="MEE504"
          required
        />

        <label>Session / Semester</label>
        <input
          value={sessionLabel}
          onChange={(e) => setSessionLabel(e.target.value)}
          placeholder="2026/2027 Rain Semester"
          required
        />

        <label>Expected student count (optional)</label>
        <input
          type="number"
          value={expectedCount}
          onChange={(e) => setExpectedCount(e.target.value)}
          placeholder="60"
        />

        <label>Minimum attendance policy (%)</label>
        <input
          type="number"
          value={attendancePolicy}
          onChange={(e) => setAttendancePolicy(e.target.value)}
          min="0"
          max="100"
        />

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate("/dashboard")}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
}