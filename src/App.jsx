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
import Spinner from "./components/Spinner";

function LoadingScreen() {
  return (
    <div className="auth-loading-screen">
      <Spinner />
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






