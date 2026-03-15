import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Employees from './pages/Employees';
import TrainingCenter from './pages/TrainingCenter';
import WorkloadHeatmap from './pages/WorkloadHeatmap';
import Login from './pages/Login';
import { initializeEmployeeRating } from './services/firebase';

function App() {
  useEffect(() => {
    // Initialize rating fields for all employees on load
    initializeEmployeeRating()
      .then(() => console.log('NeurAX: Employee ratings initialized.'))
      .catch(err => console.error('NeurAX: Failed to initialize ratings:', err));
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="*" 
            element={
              <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-purple-500/30">
                <Navbar />
                <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 overflow-x-hidden">
                  <div className="page-fade-in w-full">
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/project/:id" 
                        element={
                          <ProtectedRoute>
                            <ProjectDetail />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/employees" 
                        element={
                          <ProtectedRoute>
                            <Employees />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/training" 
                        element={
                          <ProtectedRoute>
                            <TrainingCenter />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/heatmap" 
                        element={
                          <ProtectedRoute>
                            <WorkloadHeatmap />
                          </ProtectedRoute>
                        } 
                      />
                    </Routes>
                  </div>
                </main>
              </div>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
