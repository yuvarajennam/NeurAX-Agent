import { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import ProjectCard from '../components/ProjectCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { extractProjectDetails } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Toast from '../components/Toast';

export default function Dashboard() {
  const { data: projects, loading, error } = useProjects();
  const [aiInput, setAiInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedProject, setExtractedProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleExtract = async () => {
    if (!aiInput.trim()) {
      setInputError(true);
      return;
    }
    setInputError(false);
    setIsExtracting(true);
    try {
      const result = await extractProjectDetails(aiInput);
      setExtractedProject(result);
      setIsEditing(false);
    } catch (err) {
      showToast("Could not extract project details. Please try again.", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    try {
      // Map Gemini fields to Firestore schema
      const priorityMap = { 'High': 5, 'Medium': 3, 'Low': 1 };
      
      const projectData = {
        project_id: extractedProject.project_id,
        name: extractedProject.project_name, // Mapping project_name to name
        description: extractedProject.description,
        required_skills: Array.isArray(extractedProject.required_skills) 
          ? extractedProject.required_skills 
          : extractedProject.required_skills?.split(',').map(s => s.trim()) || [],
        deadline_days: parseInt(extractedProject.deadline_days) || 30,
        priority_score: priorityMap[extractedProject.priority] || 3, // Mapping priority to priority_score
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'projects', extractedProject.project_id), projectData);
      showToast("Project created successfully!", "success");
      setAiInput('');
      setExtractedProject(null);
    } catch (err) {
      showToast("Failed to save project: " + err.message, "error");
    }
  };

  // Calculate stats
  const stats = {
    total: projects.length,
    assigned: projects.filter(p => p.status === 'assigned').length,
    pending: projects.filter(p => p.status === 'pending' || !p.status || p.status === 'assigned').length, 
    completed: projects.filter(p => p.status === 'completed').length,
  };
  
  const pendingCount = projects.filter(p => p.status === 'pending' || !p.status).length;
  const activeCount = projects.filter(p => p.status === 'assigned').length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-red-400 text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm leading-relaxed">We couldn't fetch the projects. Please make sure Firebase is configured correctly in your .env file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">
      <header className="mb-10 lg:flex items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-100 mb-2 tracking-tight">Project Dashboard</h1>
          <p className="text-gray-500 font-medium">Overview of all active and pending agency initiatives.</p>
        </div>
      </header>

      {/* AI Project Input Section */}
      <section className="mb-12">
        <div className="bg-gray-900/40 border-2 border-purple-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
          {/* Background Glow */}
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="relative">
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 block">
              Autonomous Project Onboarding
            </label>
            
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Describe your project in plain English... e.g. We need to build a fraud detection system using ML and Python, deadline is 3 weeks, high priority"
              className={`w-full bg-black/40 border-2 ${inputError ? 'border-red-500/50' : 'border-gray-800'} rounded-3xl p-6 text-gray-200 placeholder:text-gray-700 outline-none focus:border-purple-500/40 transition-all min-h-[120px] resize-none mb-4`}
            />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-gray-600 font-medium tracking-wide">
                <span className="text-purple-500">◆</span> NeurAX Agent will automatically extract requirements, skills, deadline and priority.
              </p>
              
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
              >
                {isExtracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Extracting Details...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Create with AI
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Extraction Preview Card */}
          {extractedProject && (
            <div className="mt-10 pt-10 border-t border-gray-800 transition-all duration-700 animate-in fade-in slide-in-from-top-4">
              <div className="bg-black/60 border border-purple-500/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>

                {isEditing ? (
                  <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Project Name</label>
                        <input 
                          value={extractedProject.project_name} 
                          onChange={(e) => setExtractedProject({...extractedProject, project_name: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/40 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Priority</label>
                        <select 
                          value={extractedProject.priority} 
                          onChange={(e) => setExtractedProject({...extractedProject, priority: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/40 outline-none"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Description</label>
                      <textarea 
                        value={extractedProject.description} 
                        onChange={(e) => setExtractedProject({...extractedProject, description: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/40 outline-none min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Required Skills (Comma separated)</label>
                        <input 
                          value={Array.isArray(extractedProject.required_skills) ? extractedProject.required_skills.join(', ') : extractedProject.required_skills} 
                          onChange={(e) => setExtractedProject({...extractedProject, required_skills: e.target.value.split(',').map(s => s.trim())})}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/40 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Deadline (Days)</label>
                        <input 
                          type="number"
                          value={extractedProject.deadline_days} 
                          onChange={(e) => setExtractedProject({...extractedProject, deadline_days: parseInt(e.target.value)})}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/40 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${
                        extractedProject.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        extractedProject.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {extractedProject.priority} Priority
                      </span>
                      <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                        ID: {extractedProject.project_id}
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
                      {extractedProject.project_name}
                    </h2>
                    
                    <p className="text-gray-400 font-medium mb-6 leading-relaxed">
                      {extractedProject.description}
                    </p>

                    <div className="flex flex-wrap gap-4 items-center justify-between border-t border-gray-800/50 pt-6 mt-6">
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(extractedProject.required_skills) ? extractedProject.required_skills : extractedProject.required_skills?.split(';') || []).map((skill, i) => (
                          <span key={i} className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-3 py-1.5 rounded-xl border border-purple-500/10 uppercase tracking-widest">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right">
                           <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Deadline</p>
                           <p className="text-white font-black text-xs uppercase tracking-tighter">{extractedProject.deadline_days} Days</p>
                         </div>
                         <div className="w-10 h-10 rounded-2xl bg-gray-950 flex items-center justify-center text-purple-400 border border-gray-800">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                  >
                    Confirm & Save Project
                  </button>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 bg-gray-900 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Details'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Banner */}
      <div className="mb-10 bg-gradient-to-r from-purple-900/40 to-blue-900/20 border border-purple-500/20 p-6 rounded-3xl relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 shrink-0 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
            <span className="text-purple-400 font-bold">NeurAX Agent</span> uses Gemini AI to automatically analyze projects, decompose complex tasks, and assign the right employees based on skills and real-time availability.
          </p>
        </div>
      </div>

      {loading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton count={6} />
        </>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Projects" value={stats.total} />
            <StatCard label="Active" value={activeCount} color="text-purple-400" />
            <StatCard label="Pending" value={pendingCount} color="text-yellow-400" />
            <StatCard label="Completed" value={stats.completed} color="text-emerald-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {projects.length === 0 && (
              <div className="col-span-full py-24 text-center bg-gray-900/20 border-2 border-dashed border-gray-800 rounded-[3rem]">
                <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-700">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-gray-500 font-bold text-xl mb-1">No Projects Found</h3>
                <p className="text-gray-600">Use the seeding script to add some initial data.</p>
              </div>
            )}
          </div>
        </>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-100" }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:bg-gray-800/40 transition-colors">
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className={`w-12 h-12 rounded-full border-4 border-current ${color}`}></div>
      </div>
      <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-1">{label}</p>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
    </div>
  );
}
