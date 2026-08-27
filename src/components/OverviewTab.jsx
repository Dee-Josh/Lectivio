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
import { getNextLectureDate, formatLectureDate, lectureDateKey, WEEKDAYS } from "../utils/schedule";
import { Trash, Trash2 } from "lucide-react";

export default function OverviewTab({ onNavigate, course, courseId, lecturerId }) {
  const [studentCount, setStudentCount] = useState(course.studentCount || 0);
  const [materialCount, setMaterialCount] = useState(0);
    
  // Next Lecture state
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [slots, setSlots] = useState(course.weeklySchedule?.slots || []);
  const [scheduleLocation, setScheduleLocation] = useState(course.weeklySchedule?.location || "");
  const [topicOverrideInput, setTopicOverrideInput] = useState("");

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

  function toggleDay(day) {
    setSlots((prev) => {
      const exists = prev.find((s) => s.day === day);
      if (exists) {
        return prev.filter((s) => s.day !== day);
      }
      return [...prev, { day, time: "" }];
    });
  }

  function updateSlotTime(day, time) {
    setSlots((prev) => prev.map((s) => (s.day === day ? { ...s, time } : s)));
  }

  function saveSchedule(e) {
    e.preventDefault();
    const validSlots = slots.filter((s) => s.time);
    if (validSlots.length === 0) return;
    updateDoc(courseRef, {
      weeklySchedule: { slots: validSlots, location: scheduleLocation },
    }).catch((err) => console.error("Failed to save schedule:", err));
    setEditingSchedule(false);
  }

  function clearSchedule() {
    updateDoc(courseRef, { weeklySchedule: null }).catch((err) =>
      console.error("Failed to clear schedule:", err)
    );
    setSlots([]);
    setScheduleLocation("");
    setEditingSchedule(false);
    setTopicOverrideInput("")
  }  

  const weeklySchedule = course.weeklySchedule;
  const nextLectureDate = getNextLectureDate(weeklySchedule);
  const dateKey = lectureDateKey(nextLectureDate);
  const savedOverride = course.topicOverrides?.[dateKey];
  const nextUncheckedTopic = topics.find((t) => !t.completed);
  const displayTopic = savedOverride || nextUncheckedTopic?.title || "No topic set";

  function handleOverrideSubmit(e) {
    e.preventDefault();
    if (!topicOverrideInput.trim() || !dateKey) return;
    updateDoc(courseRef, {
      [`topicOverrides.${dateKey}`]: topicOverrideInput.trim(),
    }).catch((err) => console.error("Failed to save topic override:", err));
    setTopicOverrideInput("");
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
          <h3>Weekly Lecture Schedule</h3>

          {editingSchedule ? (
            <form onSubmit={saveSchedule} className="next-lecture-form">
              <label>Which days does this class hold, and at what time?</label>
              <div className="day-time-list">
                {WEEKDAYS.map((day) => {
                  const slot = slots.find((s) => s.day === day);
                  return (
                    <div className="day-time-row" key={day}>
                      <button
                        type="button"
                        className={`day-chip ${slot ? "selected" : ""}`}
                        onClick={() => toggleDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                      {slot && (
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateSlotTime(day, e.target.value)}
                          className="day-time-input"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <label>Location (optional, applies to all days)</label>
              <input
                value={scheduleLocation}
                onChange={(e) => setScheduleLocation(e.target.value)}
                placeholder="e.g. LT 2"
              />

              <div className="form-actions">
                <button type="button" onClick={() => setEditingSchedule(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={slots.filter((s) => s.time).length === 0}
                >
                  Save Schedule
                </button>
              </div>
            </form>
          ) : weeklySchedule ? (
            <>
              <div className="weekly-days-row">
                {weeklySchedule.slots.map((s) => (
                  <span key={s.day} className="day-badge">
                    {s.day.slice(0, 3)} by {s.time}
                  </span>
                ))}
                {weeklySchedule.location && (
                  <span className="muted small">· {weeklySchedule.location}</span>
                )}
              </div>

              {nextLectureDate && (
                <div className="next-lecture-highlight">
                  <p className="muted small">Next Lecture</p>
                  <p className="next-lecture-topic">{displayTopic}</p>
                  <strong><p className="muted small">{formatLectureDate(nextLectureDate)}</p></strong>

                  <form onSubmit={handleOverrideSubmit}>
                    <input
                      className="topic-override-input"
                      placeholder="Override topic for this lecture, then press Enter"
                      value={topicOverrideInput}
                      onChange={(e) => setTopicOverrideInput(e.target.value)}
                    />
                  </form>
                </div>
              )}

              <div className="overview-panel-actions">
                <button className="secondary-btn" onClick={() => setEditingSchedule(true)}>
                  Edit Schedule
                </button>
                <button className="link-btn danger" onClick={clearSchedule}>
                  Clear
                </button>
              </div>

              <p className="muted small reminder-note">
                🔔 Reminders/notifications coming soon.
              </p>
            </>
          ) : (
            <>
              <p className="muted" style={{marginBottom: '10px'}}>No weekly schedule set yet.</p>
              <button className="primary-btn" onClick={() => setEditingSchedule(true)}>
                Set Weekly Schedule
              </button>
            </>
          )}
        </div>

        {/* Course Outline */}
        <div className="overview-panel">
          <div className="outline-header">
            <h3>Course Outline</h3>
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
                    <Trash2 size={13} />
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
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}