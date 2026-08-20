import { useState,  } from "react";
import { Link } from "react-router-dom";
import Sidebar from "./SideBar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-content">
        <div className="sidebar-logo mobile-logo">
            <Link to="/dashboard" >
              <div>
                <span className="sidebar-logo-icon">📖</span>
                <span className="sidebar-logo-text">Lectivio</span>
              </div>
            </Link>

            <button
            className="mobile-menu-btn"
            onClick={() => {setSidebarOpen(!sidebarOpen)}}
            aria-label="Open menu"
            >
            ☰ 
            {/* <span className="mobile-menu-label">Menu</span> */}
            </button>
        </div>
        {children}
      </div>
    </div>
  );
}