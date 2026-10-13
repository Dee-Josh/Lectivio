import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import Spinner from "./Spinner";
import { normKey } from "../utils/attendance";
import "../students-select.css";

export default function StudentsTab({ courseId, lecturerId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set()); // ids of ticked students
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState("");
  const [editMatric, setEditMatric] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // form state for manual add
  const [name, setName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");

  // CSV import state
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState("");

  const studentsRef = collection(
    db,
    "lecturers",
    lecturerId,
    "courses",
    courseId,
    "students"
  );

  useEffect(() => {
    const q = query(studentsRef, orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [courseId]);

  function handleAddStudent(e) {
    e.preventDefault();
    if (!name || !matricNumber) return;
    setIsSubmitting(true);

    const newDocRef = doc(studentsRef);
    setDoc(newDocRef, {
      name,
      matricNumber,
      matricKey: normKey(matricNumber),
      addedAt: serverTimestamp(),
    }).catch((err) => console.error("Background sync failed (add student):", err));

    const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);
    updateDoc(courseRef, { studentCount: increment(1) }).catch((err) =>
      console.error("Failed to update student count:", err)
    );

    setTimeout(() => {
      setName("");
      setMatricNumber("");
      setShowAddModal(false);
      setIsSubmitting(false);
    }, 400);
  }


  function handleCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCsvError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      if (lines.length === 0) {
        setCsvError("File is empty.");
        return;
      }

      const startIdx = /name/i.test(lines[0]) ? 1 : 0;
      const rows = [];

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          rows.push({ name: parts[0], matricNumber: parts[1] });
        }
      }

      if (rows.length === 0) {
        setCsvError("No valid rows found. Expected format: name,matricNumber");
        return;
      }

      setCsvRows(rows);
    };
    reader.readAsText(file);
  }

  function handleImportConfirm() {
    setIsImporting(true);
    const batch = writeBatch(db);
    csvRows.forEach((row) => {
      const newDocRef = doc(studentsRef);
      batch.set(newDocRef, {
        name: row.name,
        matricNumber: row.matricNumber,
        matricKey: normKey(row.matricNumber),
        addedAt: serverTimestamp(),
      });
    });
    batch.commit().catch((err) => console.error("Background sync failed (CSV import):", err));

    const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);
    updateDoc(courseRef, { studentCount: increment(csvRows.length) }).catch((err) =>
      console.error("Failed to update student count:", err)
    );

    setTimeout(() => {
      setCsvRows([]);
      setShowImportModal(false);
      setIsImporting(false);
    }, 400);
  }


  function openEdit(student) {
    setEditingStudent(student);
    setEditName(student.name);
    setEditMatric(student.matricNumber);
  }

  function handleEditSave(e) {
    e.preventDefault();
    const studentRef = doc(
      db,
      "lecturers",
      lecturerId,
      "courses",
      courseId,
      "students",
      editingStudent.id
    );
    updateDoc(studentRef, {
      name: editName,
      matricNumber: editMatric,
      matricKey: normKey(editMatric),
    }).catch((err) => {
      console.error("Background sync failed (edit student):", err);
    });
    setEditingStudent(null);
  }

  // function handleDeleteStudent(studentId) {
  //   if (!window.confirm("Remove this student? This can't be undone.")) return;
  //   const studentRef = doc(
  //     db,
  //     "lecturers",
  //     lecturerId,
  //     "courses",
  //     courseId,
  //     "students",
  //     studentId
  //   );
  //   deleteDoc(studentRef).catch((err) => {
  //     console.error("Background sync failed (delete student):", err);
  //   });
  // }
  function handleDeleteStudent(studentId) {
    if (!window.confirm("Remove this student? This can't be undone.")) return;
    const studentRef = doc(db, "lecturers", lecturerId, "courses", courseId, "students", studentId);
    deleteDoc(studentRef).catch((err) => console.error("Background sync failed (delete student):", err));

    const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);
    updateDoc(courseRef, { studentCount: increment(-1) }).catch((err) =>
      console.error("Failed to update student count:", err)
    );
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Only students currently visible (after search) count as selected, so nothing hidden gets deleted
  const selectedIds = filteredStudents.filter((s) => selected.has(s.id)).map((s) => s.id);
  const allSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => (allSelected ? next.delete(s.id) : next.add(s.id)));
      return next;
    });
  }

  function handleDeleteSelected() {
    const ids = selectedIds;
    if (ids.length === 0) return;
    const label = `${ids.length} student${ids.length === 1 ? "" : "s"}`;
    if (
      !window.confirm(
        `Remove ${label} from this course? This can't be undone.\n\nTheir past attendance stays in each session's history.`
      )
    )
      return;

    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) =>
        batch.delete(doc(db, "lecturers", lecturerId, "courses", courseId, "students", id))
      );
      batch.commit().catch((err) => console.error("Background sync failed (delete students):", err));
    }

    const courseRef = doc(db, "lecturers", lecturerId, "courses", courseId);
    updateDoc(courseRef, { studentCount: increment(-ids.length) }).catch((err) =>
      console.error("Failed to update student count:", err)
    );
    setSelected(new Set());
  }

  if (loading) return <Spinner />;

  return (
    <div className="students-tab">
      <div className="students-header">
        <input
          className="search-input width100"
          placeholder="Search students by name or matric number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="action-buttons">
          <button onClick={() => setShowAddModal(true)} className="primary-btn width100">
            + Add Student
          </button>
          <button onClick={() => setShowImportModal(true)} className="secondary-btn width100">
            Import CSV
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="muted">No students added yet.</p>
      ) : (
        <>
        {selectedIds.length > 0 && (
          <div className="stu-select-bar">
            <span className="stu-select-count">{selectedIds.length} selected</span>
            <button className="secondary-btn danger" onClick={handleDeleteSelected}>
              Delete selected
            </button>
            {!allSelected && filteredStudents.length > selectedIds.length && (
              <button className="link-btn" onClick={toggleSelectAll}>
                Select all {filteredStudents.length}
              </button>
            )}
            <button className="link-btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}
        <table className="students-table stu-select-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all students"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.length > 0 && !allSelected;
                  }}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Name</th>
              <th>Matric Number</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id} className={selected.has(s.id) ? "row-selected" : ""}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${s.name}`}
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelected(s.id)}
                  />
                </td>
                <td>{s.name}</td>
                <td>{s.matricNumber}</td>
                <td className="row-actions">
                  <button onClick={() => openEdit(s)} className="link-btn">Edit</button>
                  <button onClick={() => handleDeleteStudent(s.id)} className="link-btn danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Student</h3>
            <form onSubmit={handleAddStudent}>
              <label>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tunde Adebayo"
                required
              />
              <label>Matric number</label>
              <input
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. MTE/2020/1043"
                required
              />
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Import Students (CSV)</h3>
            <p className="muted">CSV format: name,matricNumber (one per line)</p>
            <input type="file" accept=".csv" onChange={handleCsvFile} />
            {csvError && <p className="error">{csvError}</p>}
            {csvRows.length > 0 && (
              <div className="csv-preview">
                <p>{csvRows.length} students found</p>
                <ul>
                  {csvRows.slice(0, 5).map((r, i) => (
                    <li key={i}>{r.name} — {r.matricNumber}</li>
                  ))}
                  {csvRows.length > 5 && <li>...and {csvRows.length - 5} more</li>}
                </ul>
              </div>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={csvRows.length === 0 || isImporting}
                className="primary-btn"
              >
                {isImporting ? "Importing..." : "Import Students"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Student</h3>
            <form onSubmit={handleEditSave}>
              <label>Full name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <label>Matric number</label>
              <input
                value={editMatric}
                onChange={(e) => setEditMatric(e.target.value)}
                required
              />
              <div className="form-actions">
                <button type="button" onClick={() => setEditingStudent(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}