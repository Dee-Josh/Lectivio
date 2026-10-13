import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import { UserRound, Bell, SlidersHorizontal, Plug, ShieldCheck, Save, Cloud, CalendarDays, FileSpreadsheet, Mail, KeyRound, ExternalLink, CheckCircle2 } from "lucide-react";
import "./Settings.css";

const TABS = [
  { id: "profile", label: "Profile & Account", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Plug },
];
const DEFAULT_NOTIFICATIONS = { attendanceReminders: true, assessmentDueReminders: true, newStudentAdded: true, resultsPublished: true, inAppEnabled: true };
const DEFAULT_PREFERENCES = { dateFormat: "DD/MM/YYYY", timeFormat: "12-hour", lateWindow: "15", language: "English" };

export default function Settings() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", email: "", institution: "" });
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [profileSnap, notificationSnap, preferenceSnap] = await Promise.all([
          getDoc(doc(db, "lecturers", currentUser.uid)),
          getDoc(doc(db, "lecturers", currentUser.uid, "settings", "notifications")),
          getDoc(doc(db, "lecturers", currentUser.uid, "settings", "preferences")),
        ]);
        if (!active) return;
        const data = profileSnap.exists() ? profileSnap.data() : {};
        setProfile({ name: data.name || currentUser.displayName || "", email: currentUser.email || data.email || "", institution: data.institution || "" });
        if (notificationSnap.exists()) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...notificationSnap.data() });
        if (preferenceSnap.exists()) setPreferences({ ...DEFAULT_PREFERENCES, ...preferenceSnap.data() });
      } catch (e) { if (active) setError(`Could not load settings: ${e.message}`); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [currentUser]);

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      if (currentUser && profile.name.trim() !== (currentUser.displayName || "")) await updateProfile(currentUser, { displayName: profile.name.trim() });
      await setDoc(doc(db, "lecturers", currentUser.uid), { name: profile.name.trim(), email: currentUser.email || profile.email, institution: profile.institution.trim(), updatedAt: serverTimestamp() }, { merge: true });
      setMessage("Profile saved successfully.");
    } catch (e) { setError(`Could not save profile: ${e.message}`); }
    finally { setSaving(false); }
  }
  async function saveSettings(kind, values) {
    setSaving(true); setError(""); setMessage("");
    try {
      await setDoc(doc(db, "lecturers", currentUser.uid, "settings", kind), { ...values, updatedAt: serverTimestamp() }, { merge: true });
      setMessage(`${kind === "notifications" ? "Notification settings" : "Preferences"} saved successfully.`);
    } catch (e) { setError(`Could not save settings: ${e.message}`); }
    finally { setSaving(false); }
  }
  async function resetPassword() {
    setError(""); setMessage("");
    if (!currentUser?.email) { setError("There is no email address on this account."); return; }
    try { await sendPasswordResetEmail(auth, currentUser.email); setMessage(`Password reset email sent to ${currentUser.email}.`); }
    catch (e) { setError(`Could not send password reset email: ${e.message}`); }
  }
  function integrationInfo(name) {
    setMessage("");
    setError(`${name} connection is not configured yet. It needs provider OAuth credentials and a secure callback before it can be connected safely.`);
  }

  return <AppLayout>
    <main className="settings-page">
      <header className="settings-heading"><div><p className="settings-eyebrow">ACCOUNT</p><h1>Settings</h1><p className="settings-subtitle">Manage your account, notifications and Lectivio preferences.</p></div></header>
      <div className="tab-container">
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`settings-tab ${tab === id ? "selected" : ""}`} onClick={() => { setTab(id); setMessage(""); setError(""); }}><Icon size={17}/><span>{label}</span></button>)}
        </div>
      </div>
      {message && <div className="settings-notice success"><CheckCircle2 size={17}/>{message}</div>}
      {error && <div className="settings-notice error">{error}</div>}
      {loading ? <div className="settings-loading">Loading your settings…</div> : <>
        {tab === "profile" && <section className="settings-panel"><div className="settings-panel-title"><div className="settings-icon"><UserRound/></div><div><h2>Profile & Account</h2><p>Update the details associated with your lecturer account.</p></div></div>
          <form className="settings-form" onSubmit={saveProfile}><label>Full name<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required /></label><label>Email address<input value={profile.email} readOnly type="email"/><small>Email changes are managed through Firebase Authentication.</small></label><label>Institution<input value={profile.institution} onChange={e => setProfile(p => ({ ...p, institution: e.target.value }))} placeholder="School or institution name" /></label><div className="settings-actions"><button className="settings-primary" disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save changes"}</button></div></form>
          <div className="settings-divider"/><div className="settings-panel-title"><div className="settings-icon"><ShieldCheck/></div><div><h2>Account security</h2><p>Keep access to your account secure.</p></div></div><div className="settings-integration-row"><div className="settings-row-icon"><KeyRound/></div><div className="settings-row-copy"><strong>Password</strong><span>Send a password reset link to your account email.</span></div><button className="settings-secondary" type="button" onClick={resetPassword}>Reset password</button></div>
        </section>}
        {tab === "notifications" && <section className="settings-panel"><div className="settings-panel-title"><div className="settings-icon"><Bell/></div><div><h2>Notifications</h2><p>Choose which updates you want Lectivio to notify you about.</p></div></div><h3 className="settings-group-title"><Mail size={16}/> Email notifications</h3>{[["attendanceReminders","Attendance session reminders"],["assessmentDueReminders","Assessment due reminders"],["newStudentAdded","New student added"],["resultsPublished","Results published"]].map(([key,label])=><label className="settings-toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={!!notifications[key]} onChange={e=>setNotifications(n=>({...n,[key]:e.target.checked}))}/><span className="settings-switch" aria-hidden="true"/></label>)}<h3 className="settings-group-title">In-app notifications</h3><label className="settings-toggle-row"><span>Enable in-app notifications</span><input type="checkbox" checked={!!notifications.inAppEnabled} onChange={e=>setNotifications(n=>({...n,inAppEnabled:e.target.checked}))}/><span className="settings-switch" aria-hidden="true"/></label><div className="settings-actions"><button className="settings-primary" disabled={saving} onClick={()=>saveSettings("notifications",notifications)}><Save size={16}/>{saving?"Saving…":"Save notification settings"}</button></div><p className="settings-footnote">These preferences are saved to your account. Actual email delivery requires notification delivery services to be configured.</p></section>}
        {tab === "preferences" && <section className="settings-panel"><div className="settings-panel-title"><div className="settings-icon"><SlidersHorizontal/></div><div><h2>Preferences</h2><p>Set defaults for how information is displayed and attendance is handled.</p></div></div><div className="settings-form settings-preferences"><label>Date format<select value={preferences.dateFormat} onChange={e=>setPreferences(p=>({...p,dateFormat:e.target.value}))}><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></label><label>Time format<select value={preferences.timeFormat} onChange={e=>setPreferences(p=>({...p,timeFormat:e.target.value}))}><option value="12-hour">12-hour (1:00 PM)</option><option value="24-hour">24-hour (13:00)</option></select></label><label>Default attendance late window<select value={preferences.lateWindow} onChange={e=>setPreferences(p=>({...p,lateWindow:e.target.value}))}><option value="0">No grace period</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select><small>Used as the default when creating a new attendance session.</small></label><label>Language<select value={preferences.language} onChange={e=>setPreferences(p=>({...p,language:e.target.value}))}><option>English</option></select><small>More languages can be added when translations are available.</small></label></div><div className="settings-actions"><button className="settings-primary" disabled={saving} onClick={()=>saveSettings("preferences",preferences)}><Save size={16}/>{saving?"Saving…":"Save preferences"}</button></div><p className="settings-footnote">Preferences are saved to Firestore. Applying date/time formats across every existing screen requires those screens to read these saved preferences.</p></section>}
        {tab === "integrations" && <section className="settings-panel"><div className="settings-panel-title"><div className="settings-icon"><Plug/></div><div><h2>Integrations</h2><p>Connect services to support export, backup and scheduling workflows.</p></div></div><div className="settings-integrations">{[{name:"Google Drive",desc:"Back up files and export course data.",icon:Cloud},{name:"Microsoft Excel",desc:"Export attendance and results to spreadsheet files.",icon:FileSpreadsheet},{name:"Google Calendar",desc:"Sync course events and attendance sessions.",icon:CalendarDays}].map(({name,desc,icon:Icon})=><div className="settings-integration-row" key={name}><div className="settings-row-icon"><Icon/></div><div className="settings-row-copy"><strong>{name}</strong><span>{desc}</span></div><span className="settings-not-connected">Not connected</span><button className="settings-secondary" type="button" onClick={()=>integrationInfo(name)}>Connect <ExternalLink size={14}/></button></div>)}</div><div className="settings-integration-note">Connections are not active yet. Each service needs OAuth credentials, a secure authorization callback and a defined sync/export workflow. No service is marked connected until that flow succeeds.</div></section>}
      </>}
    </main>
  </AppLayout>;
}
