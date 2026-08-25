import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import Spinner from "./Spinner";

export default function OverviewTab({ onNavigate, course, courseId, lecturerId }) {
    const [studentCount, setStudentCount] = useState(course.studentCount || 0);
    const [materialCount, setMaterialCount] = useState(0);
    
    const [navToStudent, setNavToStudent] = useState(false);
    
  // Next Lecture state
  const [editingLecture, setEditingLecture] = useState(false);
  const [lectureTopic, setLectureTopic] = useState(course.nextLecture?.topic || "");
  const [lectureDate, setLectureDate] = useState(course.nextLecture?.date || "");
  const [lectureTime, setLectureTime] = useState(course.nextLecture?.time || "");
  const [lectureLocation, setLectureLocation] = useState(course.nextLecture?.location || "");

  // Outline state
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [newTopic, setNewTopic] = useState("");

  const materialsRef = collection(db, "lecturers", lecturerId, "courses", courseId, "materials");
  const outlineRef = collection(db, "lecturers", lecturerId, "courses", courseId, "outline");
  const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);

  useEffect(() => {
    const unsub = onSnapshot(materialsRef, (snap) => setMaterialCount(snap.size));
    return unsub;
  }, [courseId]);

  useEffect(() => {
    setStudentCount(course.studentCount || 0);
  }, [course.studentCount]);

  useEffect(() => {
    const q = query(outlineRef, orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setTopics(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingTopics(false);
    });
    return unsub;
  }, [courseId]);

  function saveNextLecture(e) {
    e.preventDefault();
    updateDoc(courseRef, {
      nextLecture: {
        topic: lectureTopic,
        date: lectureDate,
        time: lectureTime,
        location: lectureLocation,
      },
    }).catch((err) => console.error("Failed to save next lecture:", err));
    setEditingLecture(false);
  }

  function clearNextLecture() {
    updateDoc(courseRef, { nextLecture: null }).catch((err) =>
      console.error("Failed to clear next lecture:", err)
    );
    setLectureTopic("");
    setLectureDate("");
    setLectureTime("");
    setLectureLocation("");
    setEditingLecture(false);
  }

  function addTopic(e) {
    e.preventDefault();
    if (!newTopic.trim()) return;
    addDoc(outlineRef, {
      title: newTopic.trim(),
      completed: false,
      order: topics.length,
      createdAt: serverTimestamp(),
    }).catch((err) => console.error("Failed to add topic:", err));
    setNewTopic("");
  }

  function toggleTopic(topic) {
    const topicRef = doc(outlineRef, topic.id);
    updateDoc(topicRef, { completed: !topic.completed }).catch((err) =>
      console.error("Failed to toggle topic:", err)
    );
  }

  function deleteTopic(topicId) {
    deleteDoc(doc(outlineRef, topicId)).catch((err) =>
      console.error("Failed to delete topic:", err)
    );
  }

  const completedCount = topics.filter((t) => t.completed).length;
  const progressPct = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;
  const nextLecture = course.nextLecture;

  return (
    <div className="overview-tab">
      {/* Stat Cards */}
      <div className="overview-stats">
        <div className="overview-stat-card" onClick={()=>{onNavigate("materials")}}>
          <p className="stat-label">Materials</p>
          <p className="stat-value">{materialCount}</p>
          <span className="stat-link">View materials →</span>
        </div>
        <div className="overview-stat-card" onClick={()=>{onNavigate("students")}}>
          <p className="stat-label">Students</p>
          <p className="stat-value">{studentCount}</p>
          <span className="stat-link">View all students →</span>
        </div>
        <div className="overview-stat-card soon">
          <p className="stat-label">Attendance Rate</p>
          <p className="stat-value">—</p>
          <span className="stat-sub">Coming soon</span>
        </div>
        <div className="overview-stat-card soon">
          <p className="stat-label">Assessments</p>
          <p className="stat-value">—</p>
          <span className="stat-sub">Coming soon</span>
        </div>
      </div>

      <div className="overview-grid">
        {/* Next Lecture */}
        <div className="overview-panel">
          <h3>Next Lecture</h3>

          {editingLecture ? (
            <form onSubmit={saveNextLecture} className="next-lecture-form">
              <label>Topic</label>
              <input
                value={lectureTopic}
                onChange={(e) => setLectureTopic(e.target.value)}
                placeholder="e.g. Bernoulli's Equation"
                required
              />
              <label>Date</label>
              <input
                type="date"
                value={lectureDate}
                onChange={(e) => setLectureDate(e.target.value)}
                required
              />
              <label>Time</label>
              <input
                type="time"
                value={lectureTime}
                onChange={(e) => setLectureTime(e.target.value)}
                required
              />
              <label>Location (optional)</label>
              <input
                value={lectureLocation}
                onChange={(e) => setLectureLocation(e.target.value)}
                placeholder="e.g. LT 2"
              />
              <div className="form-actions">
                <button type="button" onClick={() => setEditingLecture(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save
                </button>
              </div>
            </form>
          ) : nextLecture ? (
            <>
              <p className="next-lecture-topic">{nextLecture.topic}</p>
              <p className="muted small">
                {nextLecture.date} · {nextLecture.time}
                {nextLecture.location && ` · ${nextLecture.location}`}
              </p>
              <div className="overview-panel-actions">
                <button className="secondary-btn" onClick={() => setEditingLecture(true)}>
                  Edit
                </button>
                <button className="link-btn danger" onClick={clearNextLecture}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">No lecture scheduled yet.</p>
              <button className="primary-btn" onClick={() => setEditingLecture(true)}>
                Schedule Next Lecture
              </button>
            </>
          )}
        </div>

        {/* Course Outline */}
        <div className="overview-panel">
          <div className="outline-header">
            <h3>Course Outline (Scheme of Work)</h3>
            {topics.length > 0 && (
              <span className="muted small">
                {completedCount} of {topics.length} completed
              </span>
            )}
          </div>

          {topics.length > 0 && (
            <div className="outline-progress-bar">
              <div
                className="outline-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {loadingTopics ? (
            <Spinner label="Loading outline..." />
          ) : (
            <div className="outline-list">
              {topics.map((topic) => (
                <div className="outline-item" key={topic.id}>
                  <label className="outline-checkbox">
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => toggleTopic(topic)}
                    />
                    <span className={topic.completed ? "outline-done" : ""}>
                      {topic.title}
                    </span>
                  </label>
                  <button
                    className="link-btn danger small-link"
                    onClick={() => deleteTopic(topic.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addTopic} className="outline-add-form">
            <input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add a topic (e.g. Fluid Kinematics)"
            />
            <button type="submit" className="secondary-btn">
              + Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}