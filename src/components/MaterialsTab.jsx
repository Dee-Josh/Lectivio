import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { supabase } from "../supabase";
import Spinner from "./Spinner";

export default function MaterialsTab({ courseId, lecturerId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const materialsRef = collection(
    db, "lecturers", lecturerId, "courses", courseId, "materials"
  );

  useEffect(() => {
    const q = query(materialsRef, orderBy("uploadedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMaterials(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [courseId]);

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported right now.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File must be under 25MB.");
      return;
    }

    setUploadError("");
    setUploading(true);

    const storagePath = `lecturers/${lecturerId}/courses/${courseId}/materials/${Date.now()}_${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from("materials")
      .upload(storagePath, file, { upsert: false });

    if (uploadErr) {
      console.error("Upload failed:", uploadErr);
      setUploadError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    await addDoc(materialsRef, {
      name: file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      storagePath,
      size: file.size,
      uploadedAt: serverTimestamp(),
    }).catch((err) => console.error("Failed to save material metadata:", err));

    setUploading(false);
  }

  function openRename(material) {
    setRenamingId(material.id);
    setRenameValue(material.name);
  }

  function saveRename(materialId) {
    if (!renameValue.trim()) return;
    const materialRef = doc(db, "lecturers", lecturerId, "courses", courseId, "materials", materialId);
    updateDoc(materialRef, { name: renameValue.trim() }).catch((err) =>
      console.error("Rename failed:", err)
    );
    setRenamingId(null);
  }

  async function handleOpen(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.storagePath, 3600); // 1 hour

    if (error) {
      console.error("Failed to open file:", error);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(material) {
    if (!window.confirm(`Delete "${material.name}"? This can't be undone.`)) return;

    const materialRef = doc(db, "lecturers", lecturerId, "courses", courseId, "materials", material.id);
    deleteDoc(materialRef).catch((err) => console.error("Failed to delete material record:", err));

    const { error } = await supabase.storage.from("materials").remove([material.storagePath]);
    if (error) console.error("Failed to delete file from storage:", error);
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`;
  }

  if (loading) return <Spinner label="Loading materials..." />;

  return (
    <div className="materials-tab">
      <div className="materials-header">
        <div>
          <h3>Course Materials</h3>
          <p className="muted small">Upload lecture notes, slides, and handouts (PDF only for now).</p>
        </div>
        <label className="primary-btn upload-btn">
          + Upload PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            hidden
            disabled={uploading}
          />
        </label>
      </div>

      {uploadError && <p className="error">{uploadError}</p>}
      {uploading && <p className="muted small">Uploading...</p>}

      {materials.length === 0 ? (
        <p className="muted">No materials uploaded yet.</p>
      ) : (
        <div className="materials-list">
          {materials.map((m) => (
            <div className="material-row" key={m.id}>
              <div className="material-icon">📄</div>
              <div className="material-info">
                {renamingId === m.id ? (
                  <input
                    className="rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => saveRename(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(m.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <p className="material-name">{m.name}</p>
                )}
                <p className="muted small">{formatSize(m.size)}</p>
              </div>
              <div className="material-actions">
                <button onClick={() => handleOpen(m)} className="link-btn">Open</button>
                <button onClick={() => openRename(m)} className="link-btn">Rename</button>
                <button onClick={() => handleDelete(m)} className="link-btn danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}