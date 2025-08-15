// src/App.jsx
import { useState, useEffect } from 'react';
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
// FIX: Import your route guards from their files
import PublicRoute from './components/PublicRoute';
import ProtectedRoute from './components/ProtectedRoute';


// Layout wrapper (must be inside Router to use useLocation)
function LayoutWithNavAndFooter({ children }) {
  const location = useLocation();
  const noPromptPaths = ['/', '/login', '/register'];
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
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setIsServerReady(true);
          return true;
        }
      } catch (error) { /* do nothing */ }
      return false;
    };
    checkServerStatus().then(ready => {
      if (!ready) {
        const intervalId = setInterval(async () => {
          if (await checkServerStatus()) {
            clearInterval(intervalId);
          }
        }, 3000);
        return () => clearInterval(intervalId);
      }
    });
  }, []);

  if (!isServerReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700">
        <h1 className="text-2xl font-semibold">Connecting to Server...</h1>
        <p className="mt-2">This may take a moment if the application is waking up.</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ModuleProvider>
        <Router>
          <LayoutWithNavAndFooter>
            <Routes>
              {/* FIX: Using the imported Route Guards */}
              <Route path="/" element={ <PublicRoute> <Register /> </PublicRoute> } />
              <Route path="/login" element={ <PublicRoute> <Login /> </PublicRoute> } />

              <Route path="/dashboard" element={ <ProtectedRoute> <DashboardLayout /> </ProtectedRoute> } >
                <Route index element={<ModuleList />} />
                <Route path="module/:title" element={<ModuleDetail />} />
                <Route path="my-courses" element={<SavedCourses />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutWithNavAndFooter>
        </Router>
      </ModuleProvider>
    </AuthProvider>
  );
}

export default App;