// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import DashboardLayout from './components/DashboardLayout';
import ModuleList from './components/ModuleList';
import ModuleDetail from './components/ModuleDetail';
import SavedCourses from './components/SavedCourses';
import { ModuleProvider } from './components/ModuleContext';
import NavBar from './components/navbar';
import Footer from './components/footer';
import { AuthProvider } from './components/AuthContext';

// Route guard for protected pages
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// Route guard for public pages (redirect if already logged in)
function PublicRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : children;
}

// Layout wrapper (must be inside Router to use useLocation)
function LayoutWithNavAndFooter({ children }) {
  const location = useLocation();
  const noPromptPaths = ['/', '/login'];
  const showPromptBox = !noPromptPaths.includes(location.pathname);

  return (
    <>
      <NavBar showPromptBox={showPromptBox} />
      <div className="min-h-[calc(100vh-160px)]">{children}</div>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModuleProvider>
        <Router>
          <LayoutWithNavAndFooter>
            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected dashboard */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<ModuleList />} />
                <Route path="module/:title" element={<ModuleDetail />} />
                <Route path="my-courses" element={<SavedCourses />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutWithNavAndFooter>
        </Router>
      </ModuleProvider>
    </AuthProvider>
  );
}

export default App;
