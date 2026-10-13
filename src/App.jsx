import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CreateCourse from "./pages/CreateCourse";
import CourseView from "./pages/CourseView";
import OfflineBanner from "./components/OfflineBanner";
import ForgotPassword from "./pages/ForgotPassword";
import Landing from "./pages/Landing";
import GradeScores from "./pages/GradeScores";
import Attendance from "./pages/Attendance";
import AttendanceManagement from "./pages/AttendanceManagement";
import StudentsDirectory from "./pages/StudentsDirectory";
import Settings from "./pages/Settings";
import SpinnerFull from "./components/SpinnerFull";
import logo from "/lectivio-logo.png"

function LoadingScreen() {
  return (
    <div className="auth-loading-screen">
      <img src={logo} className="initial-loader-logo margin-18" />
      <div className="spinner" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return currentUser ? children : <Navigate to="/landing" replace />;
}


function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={currentUser ? <Navigate to="/dashboard" /> : <Landing />}
      />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Public student check-in — no login, no sidebar */}
      <Route path="/attendance" element={<Attendance />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/grade-scores"
        element={
          <PrivateRoute>
            <GradeScores />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <PrivateRoute>
            <Courses />
          </PrivateRoute>
        }
      />
      {/* Students view route from sidebar */}
      <Route
        path="/students"
        element={
          <PrivateRoute>
            <StudentsDirectory />
          </PrivateRoute>
        }
      />
      {/* Attendance route from sidebar */}
      <Route
        path="/attendance-management" 
        element={
          <PrivateRoute>
            <AttendanceManagement />
          </PrivateRoute>
        }
      />
        <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/new"
        element={
          <PrivateRoute>
            <CreateCourse />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <PrivateRoute>
            <CourseView />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
