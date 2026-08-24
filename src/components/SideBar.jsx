import { NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
// import { useAuth } from "../context/AuthContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import {
  Home,
  LogOutIcon,
  LayoutDashboard,
  BookA, 
  FileCheck2,
  Calendar,
  Users,
  Users2,
  Calendar1,
  CalendarCheck,
  ChartNoAxesCombined,
  List,
  ClipboardCheck,
  Settings,
  MessageCircle,
  LucideMessageSquare,
  BookOpen,
  PercentSquare,
  Bolt
  

} from "lucide-react";

// Former Icons

// const navItems = [
//   { label: "Dashboard", path: "/dashboard", icon: "📊" },
//   { label: "Courses", path: "/courses", icon: "📚" },
//   { label: "Grade Score", path: "/grades", icon: "🎓", disabled: true },
//   { label: "Students", path: "/students", icon: "👥", disabled: true },
//   { label: "Attendance", path: "/attendance", icon: "✅", disabled: true },
//   { label: "Assessments", path: "/assessments", icon: "📝", disabled: true },
//   { label: "Analytics", path: "/analytics", icon: "📈", disabled: true },
//   { label: "Messages", path: "/messages", icon: "💬", disabled: true },
//   { label: "Settings", path: "/settings", icon: "⚙️", disabled: true },
// ];

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: <Home /> },
  // { label: "Grade Score", path: "/grade-scores", icon: <PercentSquare />, disabled: true },
  { label: "Grade Scores", path: "/grade-scores", icon: <PercentSquare />, isNew: true },
  { label: "Courses", path: "/courses", icon: <BookOpen /> },
  { label: "Students", path: "/students", icon: <Users2 />, disabled: true },
  { label: "Attendance", path: "/attendance", icon: <CalendarCheck />, disabled: true },
  // { label: "Assessments", path: "/assessments", icon: <ClipboardCheck />, disabled: true },
  { label: "Analytics", path: "/analytics", icon: <ChartNoAxesCombined />, disabled: true },
  { label: "Messages", path: "/messages", icon: <LucideMessageSquare />, disabled: true },
  { label: "Settings", path: "/settings", icon: <Settings />, disabled: true },
];


export default function Sidebar({ isOpen, onClose }) {
  const { currentUser } = useAuth();

  return (
    <>
      <AuthProvider>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📖</span>
          <span className="sidebar-logo-text">Lectivio</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) =>
            item.disabled ? (
              <span key={item.label} className="sidebar-link disabled">
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  "sidebar-link" + (isActive ? " active" : "")
                }
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-email">{currentUser?.email}</span>
          </div>
          <button onClick={() => signOut(auth)} className="sidebar-logout">
            <LogOutIcon size={20}/> Log out
          </button>
        </div>
      </aside>
      </AuthProvider>
    </>
  );
}
