import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useEmployees } from '../hooks/useEmployees';
import AgentPanel from '../components/AgentPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: employees, loading: employeesLoading } = useEmployees();
  
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [existingPlan, setExistingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    // 1. Fetch Project Data (Real-time)
    const projectRef = doc(db, 'projects', id);
    const unsubProject = onSnapshot(projectRef, (snap) => {
      if (snap.exists()) {
        setProject({ id: snap.id, ...snap.data() });
      } else {
        setError("Project not found");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching project:", err);
      setError(err.message);
      setLoading(false);
    });

    // 2. Fetch Project History (Static fetch)
    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, 'projectHistory');
        const snap = await getDocs(historyRef);
        setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    fetchHistory();

    // 3. Listen for Agent Plans (Real-time)
    const planRef = doc(db, 'agentPlans', id);
    const unsubPlan = onSnapshot(planRef, (snap) => {
      if (snap.exists()) {
        setExistingPlan(snap.data());
      } else {
        setExistingPlan(null);
      }
    });

    return () => {
      unsubProject();
      unsubPlan();
    };
  }, [id]);

  if (loading || employeesLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-24 mb-10"></div>
        <div className="h-12 bg-gray-800 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-1/4 mb-12"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-64 bg-gray-900/50 rounded-3xl border border-gray-800"></div>
            <div className="h-48 bg-gray-900/50 rounded-3xl border border-gray-800"></div>
          </div>
          <div className="h-96 bg-gray-900/50 rounded-3xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-20 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Project Missing</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-6 py-3 rounded-2xl text-purple-400 hover:text-purple-300 font-bold transition-all">
          <span>←</span> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-2 md:px-0">
      <nav className="mb-8">
        <Link to="/" className="text-gray-500 hover:text-purple-400 text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2">
          <span>←</span> Back to Dashboard
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:items-start">
        <div className="lg:col-span-2">
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border ${
                project.priority_score >= 4 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                Priority {project.priority_score}/5
              </span>
              <span className="text-gray-700">•</span>
              <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest">ID: {project.project_id}</span>
              <span className="text-gray-700">•</span>
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border ${
                project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {project.status || 'Pending'}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">{project.name}</h1>
          </header>

          <section className="bg-gray-900/40 border border-gray-800 p-6 md:p-10 rounded-[2.5rem] mb-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             </div>
            <h3 className="text-gray-100 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
              Project Brief
            </h3>
            <p className="text-gray-400 leading-relaxed text-lg md:text-xl mb-8 font-medium">
              This initiative focuses on {project.name.toLowerCase()}. The project requires specialized skills in {Array.isArray(project.required_skills) ? project.required_skills.join(', ') : 'multiple areas'}.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(project.required_skills) ? project.required_skills : (typeof project.required_skills === 'string' ? project.required_skills.split(',') : [])).map((skill, i) => (
                <span key={i} className="bg-gray-950 text-purple-400 text-xs font-bold px-4 py-2 rounded-xl border border-purple-500/10 shadow-lg capitalize">
                  {skill.trim()}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-gray-100 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
              Timeline & History
            </h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-gray-900/20 border border-gray-800/50 rounded-2xl items-center hover:bg-gray-900/40 transition-colors">
                  <div className="text-gray-600 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{item.date}</div>
                  <div className="w-1 h-3 rounded-full bg-gray-800"></div>
                  <div className="text-gray-300 text-sm font-medium">{item.event}</div>
                </div>
              )) : (
                <div className="p-8 text-center bg-gray-950/30 border border-dashed border-gray-800 rounded-3xl">
                  <p className="text-gray-600 text-sm italic font-medium">No history records found.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-10">
          <AgentPanel 
            project={project} 
            employees={employees} 
            projectHistory={history} 
            existingPlan={existingPlan}
          />
        </aside>
      </div>
    </div>
  );
}
