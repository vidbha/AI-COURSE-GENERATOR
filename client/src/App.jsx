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
  const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting', 'db_wait', 'ready'

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/health');
        // Check if the response status is OK (e.g., 200)
        if (response.ok) {
          const data = await response.json();
          // Check the specific status from our backend
          if (data.database === 'connected') {
            setServerStatus('ready');
            return true; // Server and DB are fully ready
          }
        } else {
          // If status is not ok (e.g., 503), it means DB is not ready
          setServerStatus('db_wait');
        }
      } catch (error) {
        // This will catch network errors, like if the server is down
        setServerStatus('connecting');
      }
      return false; // Not ready yet
    };

    // Run the check immediately
    checkServerStatus();

    // Set up an interval to keep checking until the server is ready
    const intervalId = setInterval(async () => {
      const isReady = await checkServerStatus();
      if (isReady) {
        clearInterval(intervalId);
      }
    }, 3000); // Retry every 3 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Show a loading screen until the server and database are fully ready
  if (serverStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700 text-center p-4">
        <h1 className="text-2xl font-semibold">
          {serverStatus === 'connecting' && 'Connecting to Server...'}
          {serverStatus === 'db_wait' && 'Waking Up Database...'}
        </h1>
        <p className="mt-2">This may take a moment. Please wait.</p>
        <div className="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ModuleProvider>
        <Router>
          <LayoutWithNavAndFooter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

              {/* Protected dashboard */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} >
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