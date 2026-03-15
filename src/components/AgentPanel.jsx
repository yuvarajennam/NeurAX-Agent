import { useState, useMemo, useEffect } from 'react';
import { analyzeProject, getPerformanceSummary } from '../services/geminiService';
import { saveAgentPlan, updateTaskStatus, completeTask, db } from '../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Toast from './Toast';
import NotificationPortal from './NotificationPortal';
import StarRating from './StarRating';

export default function AgentPanel({ project, employees, projectHistory, existingPlan }) {
  const [loading, setLoading] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Success Prediction Logic
  const prediction = useMemo(() => {
    const skills = project?.required_skills || [];
    const currentSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : []);
    
    // 1. Historical Similarity (40%)
    let historicalFactor = 0.5; // Baseline
    let avgDays = 30;
    let histMatchesCount = 0;

    if (projectHistory && projectHistory.length > 0) {
      const similarProjects = projectHistory.map(h => {
        const histTools = Array.isArray(h.tools_used) ? h.tools_used : (h.tools_used?.split(';') || []);
        const overlap = currentSkills.filter(s => histTools.some(t => t.toLowerCase().includes(s.toLowerCase()))).length;
        const similarity = overlap / Math.max(currentSkills.length, 1);
        return { ...h, similarity };
      }).sort((a, b) => b.similarity - a.similarity);

      const topMatches = similarProjects.slice(0, 3);
      histMatchesCount = topMatches.length;
      const avgSuccess = topMatches.reduce((acc, curr) => acc + (curr.success_score || 0), 0) / Math.max(topMatches.length, 1);
      avgDays = topMatches.reduce((acc, curr) => acc + (curr.completion_days || 0), 0) / Math.max(topMatches.length, 1);
      historicalFactor = avgSuccess;
    }

    // 2. Team Skill Coverage (40%)
    const coveredSkills = currentSkills.filter(skill => 
      employees.some(emp => emp.skills?.some(s => s.toLowerCase().includes(skill.toLowerCase())))
    );
    const skillCoverageFactor = coveredSkills.length / Math.max(currentSkills.length, 1);

    // 3. Team Quality Factor (20%)
    const avgRating = employees.reduce((acc, curr) => acc + (curr.rating || 3), 0) / Math.max(employees.length, 1);
    const qualityFactor = avgRating / 5;

    // Weighted Final Probability
    const probability = Math.round((
      (historicalFactor * 0.4) + 
      (skillCoverageFactor * 0.4) + 
      (qualityFactor * 0.2)
    ) * 100);

    return {
      count: histMatchesCount,
      probability,
      avgDays: Math.round(avgDays),
      skillCoverage: Math.round(skillCoverageFactor * 100)
    };
  }, [project, projectHistory, employees]);

  const simulateThinking = async () => {
    const messages = [
      "Analyzing project requirements...",
      `Identified required skills: ${project.required_skills?.join(', ') || 'General'}`,
      `Scanning ${employees.length} specialists for optimal skill match...`,
    ];

    // Find top 3 best-fit employees for this project
    const skills = project?.required_skills || [];
    const currentSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : []);
    
    const topCandidates = [...employees]
      .map(emp => {
        const matchCount = emp.skills?.filter(s => currentSkills.some(cs => cs.toLowerCase() === s.toLowerCase())).length || 0;
        return { ...emp, matchCount };
      })
      .sort((a, b) => b.matchCount - a.matchCount || a.current_workload_percent - b.current_workload_percent)
      .slice(0, 3);

    topCandidates.forEach(emp => {
      messages.push(`${emp.employee_id} - ${emp.name}: ${emp.matchCount > 0 ? 'Optimal skill match ✓' : 'Cross-functional fit'} | Workload ${emp.current_workload_percent}% ${emp.current_workload_percent < 80 ? '✓' : '⚠'}`);
    });

    messages.push(
      "Querying project history for historical velocity patterns...",
      prediction 
        ? `Found ${prediction.count} similar past projects — Success Probability: ${prediction.probability}%`
        : "No direct historical matches found — using cross-domain baseline...",
      prediction
        ? `Historical velocity: Projects with similar skill coverage completed in ${prediction.avgDays} days avg.`
        : "Velocity estimate: Baseline established at 30 days.",
      "Synthesizing optimal assignment matrix...",
      "Identifying secondary risk flags and capacity constraints...",
      `Plan finalized. Confidence score: ${prediction ? prediction.probability + 2 : '96'}%`
    );

    setThoughts([]);
    for (const msg of messages) {
      setThoughts(prev => [...prev, msg]);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
  };

  // Use existing plan if provided
  const displayPlan = results || existingPlan;

  // Calculate Progress
  const progressStats = useMemo(() => {
    if (!displayPlan || !displayPlan.assignments) return null;
    const total = displayPlan.assignments.length;
    const completed = displayPlan.assignments.filter(a => a.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [displayPlan]);

  // Check for auto-completion
  useEffect(() => {
    if (progressStats && 
        progressStats.total > 0 && 
        progressStats.completed === progressStats.total && 
        project && project.status !== 'completed') {
      const projectRef = doc(db, 'projects', project.id);
      updateDoc(projectRef, { status: 'completed' })
        .then(() => showToast("Project completed! All tasks done.", "success"))
        .catch(console.error);
    }
  }, [progressStats, project?.id, project?.status]);

  const runAgent = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    // Start simulations
    const thinkingPromise = simulateThinking();
    const analysisPromise = analyzeProject(project, employees, projectHistory);

    try {
      const [_, analysis] = await Promise.all([thinkingPromise, analysisPromise]);
      
      // Initialize statuses for new plan
      if (analysis.assignments) {
        analysis.assignments = analysis.assignments.map(a => ({ ...a, status: 'not_started' }));
      }
      setResults(analysis);
      showToast("Strategy generated successfully!", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const planToSave = results || existingPlan;
      
      // Add assignedAt to all assignments
      if (planToSave.assignments) {
        planToSave.assignments = planToSave.assignments.map(asmt => ({
          ...asmt,
          assignedAt: serverTimestamp(),
          status: 'not_started'
        }));
      }

      await saveAgentPlan(project.id, planToSave);
      showToast("System plan synchronized", "success");
      
      // Prepare mock notifications
      if (planToSave.assignments) {
        const notifications = planToSave.assignments.map(asmt => ({
          type: Math.random() > 0.5 ? 'slack' : 'email',
          message: `To ${asmt.employee_name}: You've been assigned ${asmt.task_name} on ${project.name}. Deadline: ${project.deadline_days} days.`
        }));
        setPendingNotifications(notifications);
      }
      
      setResults(null); 
    } catch (err) {
      showToast("Failed to save: " + err.message, "error");
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      await updateTaskStatus(project.id, employeeId, newStatus);
      showToast(`Task marked as ${newStatus.replace('_', ' ')}`, "success");
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  const handleCompleteTask = async (employeeId, estimatedDays) => {
    try {
      await completeTask(project.id, employeeId, estimatedDays);
      showToast("Task completed and rating calculated!", "success");
    } catch (err) {
      showToast("Completion failed: " + err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border-2 border-purple-500/30 p-8 rounded-[2.5rem] shadow-2xl shadow-purple-500/10 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent animate-pulse"></div>
        
        <div className="relative z-10 w-full max-w-lg">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-gray-800 p-6 font-mono">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-2">NeurAX core reasoning_engine</span>
            </div>
            
            <div className="space-y-2 h-48 overflow-y-auto scrollbar-hide flex flex-col-reverse">
              <div className="animate-pulse flex items-center gap-2 text-purple-400">
                <span className="text-xs">▋</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">Orchestrating logic...</span>
              </div>
              {[...thoughts].reverse().map((thought, i) => (
                <div key={i} className={`flex items-start gap-2 text-[11px] transition-all duration-500 ${i === 0 ? 'text-white font-bold opacity-100' : 'text-gray-500 opacity-60'}`}>
                  <span className="text-purple-500 font-black mt-0.5">›</span>
                  <p className="leading-tight">{thought}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <h3 className="text-xl font-black text-white mb-2">Agent is thinking...</h3>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-2">
              <span className="w-4 h-[1px] bg-gray-800"></span>
              Optimizing resource mapping
              <span className="w-4 h-[1px] bg-gray-800"></span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (displayPlan) {
    const isCompleted = progressStats?.percentage === 100;

    return (
      <div className="space-y-6">
        {/* Progress Bar & Banner */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-6 rounded-[2rem] shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Deployment Readiness</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-400' : 'text-purple-400'}`}>
              {progressStats?.percentage}% Completed
            </span>
          </div>
          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-800 p-[2px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                progressStats?.percentage >= 100 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                progressStats?.percentage > 40 ? 'bg-yellow-500' : 'bg-purple-600'
              }`} 
              style={{ width: `${progressStats?.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Success Predictor Section */}
        {prediction && (
          <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px]"></div>
            
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {/* Circular Meter */}
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    className="text-gray-800" 
                    strokeWidth="8" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                  <circle 
                    className="text-purple-500 transition-all duration-1000 ease-out" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - prediction.probability / 100)}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{prediction.probability}%</span>
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Success</span>
                </div>
              </div>

              {/* Insights */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-gray-100 font-black uppercase tracking-widest text-[10px] mb-2 flex items-center justify-center md:justify-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  Project Success Predictor
                </h3>
                <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed">
                  Based on <span className="text-white font-bold">{prediction.count} similar past projects</span>, this team composition has an <span className="text-purple-400 font-bold">{prediction.probability}% success rate</span>. 
                  Projects with this skill coverage completed on average <span className="text-white font-bold">{prediction.avgDays} days</span>.
                </p>
                
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                     <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">High Reliability</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                     <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Verified Velocity</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900/60 backdrop-blur-2xl border border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
             <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 relative">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/10">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
              NeurAX Plan
            </h2>
            {results && (
              <button 
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Synchronize Plan</span>
              </button>
            )}
          </div>

          {/* Section A: Subtasks Table */}
          <section className="mb-10 relative">
            <h4 className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-4">Phase Decomposition</h4>
            <div className="overflow-x-auto border border-gray-800 rounded-2xl bg-gray-950/40">
              <table className="w-full text-left text-sm min-w-[400px]">
                <thead className="bg-gray-900/80 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-4">Task</th>
                    <th className="px-5 py-4">Skill</th>
                    <th className="px-5 py-4">Pri</th>
                    <th className="px-5 py-4 text-right whitespace-nowrap">Est Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {displayPlan.subtasks?.map((task, i) => (
                    <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-4 text-gray-200 font-bold text-xs">{task.task_name}</td>
                      <td className="px-5 py-4"><span className="text-[10px] font-black text-purple-500/80 uppercase whitespace-nowrap">{task.required_skill}</span></td>
                      <td className="px-5 py-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority?.toLowerCase() === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                          task.priority?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}></div>
                      </td>
                      <td className="px-5 py-4 text-right text-gray-500 font-black text-[10px] tracking-tighter">{task.estimated_days} DAYS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section B: Assignments */}
          <section className="mb-10 relative">
            <h4 className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-4">Unit Logistics</h4>
            <div className="grid grid-cols-1 gap-4">
              {displayPlan.assignments?.map((asmt, i) => (
                <AssignmentCard 
                  key={i} 
                  asmt={asmt} 
                  projectId={project.id} 
                  existingPlan={existingPlan} 
                  results={results} 
                  handleStatusChange={handleStatusChange}
                  handleComplete={handleCompleteTask}
                />
              ))}
              {!existingPlan && results && (
                <p className="text-[10px] text-gray-600 text-center italic mt-2">Initialize synchronization to enable status tracking.</p>
              )}
            </div>
          </section>

          {/* New Section: Project Performance Summary */}
          {isCompleted && existingPlan && (
            <section className="mt-12 p-8 bg-gray-950 border border-emerald-500/20 rounded-[2rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px]"></div>
               <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                 <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </span>
                 Project Performance Analytics
               </h3>

               <div className="overflow-x-auto border border-gray-800 rounded-2xl mb-8">
                 <table className="w-full text-left text-xs">
                   <thead className="bg-gray-900/50 text-gray-500 font-black uppercase tracking-widest">
                     <tr>
                       <th className="px-6 py-4">Specialist</th>
                       <th className="px-6 py-4">Task</th>
                       <th className="px-6 py-4">Est. Days</th>
                       <th className="px-6 py-4">Actual Days</th>
                       <th className="px-6 py-4">Rating</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/50">
                     {displayPlan.assignments.map((asmt, i) => (
                       <tr key={i} className="hover:bg-gray-900/40">
                         <td className="px-6 py-4 font-bold text-gray-200">{asmt.employee_name}</td>
                         <td className="px-6 py-4 text-gray-400">{asmt.task_name}</td>
                         <td className="px-6 py-4 text-gray-500 font-black">{asmt.estimated_days || 30}</td>
                         <td className={`px-6 py-4 font-black ${asmt.actual_days_taken <= (asmt.estimated_days || 30) ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {asmt.actual_days_taken} DAYS
                         </td>
                         <td className="px-6 py-4">
                            <StarRating rating={asmt.taskRating} size="sm" />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Gemini Summary Section */}
               <PerformanceSummary assignments={displayPlan.assignments} />
            </section>
          )}

          {/* Section C: Risks & Tools */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="space-y-3">
              <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Risk Analysis</h4>
              <div className="space-y-2">
                {displayPlan.risk_flags?.map((risk, i) => (
                  <div key={i} className="bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[11px] p-3 rounded-xl flex gap-3 items-start group hover:bg-orange-500/10 transition-colors font-medium">
                    <span className="mt-0.5 grayscale group-hover:grayscale-0 transition-all">⚠️</span>
                    {risk}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Stack Recommendations</h4>
              <div className="flex flex-wrap gap-2">
                {displayPlan.tool_recommendations?.map((tool, i) => (
                  <span key={i} className="bg-purple-500/10 text-purple-300 text-[10px] px-3 py-1.5 rounded-xl border border-purple-500/20 font-black tracking-widest uppercase">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <footer className="mt-12 pt-8 border-t border-gray-800/50 flex flex-wrap justify-between items-center gap-6 relative">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div className="flex flex-col">
                <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">Estimated Duration</span>
                <span className="text-2xl font-black text-white">{displayPlan.estimated_completion_days} <span className="text-purple-500">Days</span></span>
              </div>
            </div>
            {!existingPlan && (
              <button 
                onClick={runAgent}
                className="text-gray-600 hover:text-purple-400 text-[10px] font-black uppercase tracking-widest transition-colors py-2 border-b-2 border-transparent hover:border-purple-500/50"
              >
                Re-Generate Strategy
              </button>
            )}
            {error && (
              <button 
                onClick={runAgent}
                className="bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Try Again
              </button>
            )}
          </footer>
        </div>
        {pendingNotifications.length > 0 && (
          <NotificationPortal 
            notifications={pendingNotifications} 
            onComplete={() => setPendingNotifications([])} 
          />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 p-8 md:p-12 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      <div className="w-24 h-24 bg-purple-500/20 rounded-[2rem] flex items-center justify-center text-purple-400 mx-auto mb-8 rotate-6 transition-transform group-hover:rotate-12 duration-500 border border-purple-500/30">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-5.636l-.707-.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M12 7a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5z" />
        </svg>
      </div>
      <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tighter">Strategic Analysis</h2>
      <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">NeurAX AI will orchestrate project requirements, calculate historical velocity, and load-balance specialists for peak performance.</p>
      
      <button 
        onClick={runAgent}
        disabled={loading}
        className="w-full bg-gradient-to-br from-purple-600 to-purple-900 hover:from-purple-500 hover:to-purple-800 text-white font-black py-4 md:py-5 rounded-2xl shadow-2xl shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-20 group-hover:translate-y-0 transition-transform duration-500"></div>
        <span className="relative">Activate NeurAX Agent</span>
        <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {error && <p className="mt-6 text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function PerformanceSummary({ assignments }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const text = await getPerformanceSummary(assignments);
        setSummary(text);
      } catch (err) {
        setSummary("Project successfully concluded with high-quality deliverables.");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [assignments]);

  return (
    <div className="bg-gray-900 border border-emerald-500/10 p-6 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Neural Evaluator Summary</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 animate-pulse">
           <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        </div>
      ) : (
        <blockquote className="text-sm text-gray-400 italic leading-relaxed font-medium">
          "{summary}"
        </blockquote>
      )}
    </div>
  );
}

function AssignmentCard({ asmt, projectId, existingPlan, results, handleStatusChange, handleComplete }) {
  const isCompleted = asmt.status === 'completed';
  const isInProgress = asmt.status === 'in_progress';
  const isNotStarted = asmt.status === 'not_started' || !asmt.status;
  const [isCompleting, setIsCompleting] = useState(false);

  const onComplete = async () => {
    setIsCompleting(true);
    await handleComplete(asmt.employee_id, asmt.estimated_days || 30);
    setIsCompleting(false);
  };

  const [timeElapsed, setTimeElapsed] = useState('');
  useEffect(() => {
    if (isInProgress && asmt.assignedAt) {
      const timer = setInterval(() => {
        const start = asmt.assignedAt?.toDate() || new Date();
        const days = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
        setTimeElapsed(`${days} days since assigned`);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isInProgress, asmt.assignedAt]);

  return (
    <div className={`bg-gray-950/40 border-l-[6px] p-6 rounded-3xl transition-all duration-500 relative overflow-hidden ${
      isCompleted ? 'border-emerald-500/40 bg-emerald-500/5' : 
      isInProgress ? 'border-amber-500 bg-amber-500/5 shadow-xl shadow-amber-500/5' : 
      'border-gray-800'
    }`}>
      {isCompleted && (
        <div className="absolute top-2 right-4">
          <StarRating rating={asmt.taskRating} size="sm" showNumber />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-lg">
            {asmt.employee_name?.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h5 className="text-gray-100 font-black text-base tracking-tight mb-1">{asmt.employee_name}</h5>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500 scale-110' : 'bg-gray-600'}`}></div>
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{asmt.task_name}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isNotStarted && existingPlan && (
            <button 
              onClick={() => handleStatusChange(asmt.employee_id, 'in_progress')}
              className="bg-gray-800 hover:bg-amber-600/20 text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Mark In Progress
            </button>
          )}
          {isInProgress && (
            <button 
              onClick={onComplete}
              disabled={isCompleting}
              className="bg-amber-500 hover:bg-emerald-600 text-black hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isCompleting ? (
                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : null}
              {isCompleting ? 'Completing...' : 'Mark as Completed'}
            </button>
          )}
          {isCompleted && (
            <div className="text-right">
               <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">Success Criteria Met</p>
               <p className="text-gray-500 text-[9px] font-bold">Resolved in {asmt.actual_days_taken} days</p>
            </div>
          )}
          {!existingPlan && results && (
            <span className="text-gray-700 text-[9px] font-black uppercase tracking-widest">Awaiting Sync</span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed font-semibold bg-black/40 p-4 rounded-2xl border border-gray-900 mb-6">
        {asmt.reason}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800/30">
        {isInProgress && (
          <div className="flex items-center gap-2 text-amber-500/80">
            <svg className="w-4 h-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">{timeElapsed}</span>
          </div>
        )}
        {isCompleted && (
          <div className={`flex items-center gap-2 ${asmt.actual_days_taken <= (asmt.estimated_days || 30) ? 'text-emerald-500' : 'text-rose-500'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {asmt.actual_days_taken <= (asmt.estimated_days || 30) ? '✓ ON TIME' : `⚠ ${asmt.actual_days_taken - (asmt.estimated_days || 30)} DAYS LATE`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">Efficiency</span>
          <div className="w-32 bg-gray-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                asmt.workload_after > 90 ? 'bg-rose-500' : asmt.workload_after > 70 ? 'bg-amber-500' : 'bg-purple-600'
              }`} 
              style={{ width: `${asmt.workload_after}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
