import { useState, useMemo, useEffect } from 'react';
import { useWorkloadData } from '../hooks/useWorkloadData';
import StarRating from '../components/StarRating';
import Toast from '../components/Toast';

export default function WorkloadHeatmap() {
  const { employees, plans, projects, loading, calculateWorkload } = useWorkloadData();
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [showWeekends, setShowWeekends] = useState(true);
  const [showOnlyOverloaded, setShowOnlyOverloaded] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const displayDatesCount = isMobile ? 14 : 30;

  const { dates, heatmap } = useMemo(() => calculateWorkload(30), [employees, plans, projects]);
  
  const displayDates = useMemo(() => dates.slice(0, displayDatesCount), [dates, displayDatesCount]);

  const filteredHeatmap = useMemo(() => {
    return heatmap.filter(emp => {
      const roleMatch = roleFilter === 'All Roles' || emp.role === roleFilter;
      const overloadedMatch = !showOnlyOverloaded || emp.dailyWorkload.some(d => d.intensity > 80);
      return roleMatch && overloadedMatch;
    });
  }, [heatmap, roleFilter, showOnlyOverloaded]);

  const stats = useMemo(() => {
    if (!heatmap.length) return null;
    
    let maxIntensity = -1;
    let busiestEmp = null;
    let availableTodayCount = 0;
    let overloadedWeekCount = 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    // Busiest Day
    const dayTotals = dates.map((d, i) => {
      return {
        date: d,
        total: heatmap.reduce((acc, emp) => acc + emp.dailyWorkload[i].intensity, 0)
      };
    });
    const busiestDay = dayTotals.reduce((prev, current) => (prev.total > current.total) ? prev : current, dayTotals[0]);

    heatmap.forEach(emp => {
      const peak = Math.max(...emp.dailyWorkload.map(d => d.intensity));
      if (peak > maxIntensity) {
        maxIntensity = peak;
        busiestEmp = { name: emp.name, peak };
      }

      if (emp.dailyWorkload[0].intensity < 40) availableTodayCount++;

      const hasOverloadThisWeek = emp.dailyWorkload.slice(0, 7).some(d => d.intensity > 80);
      if (hasOverloadThisWeek) overloadedWeekCount++;
    });

    return {
      busiestEmp,
      availableTodayCount,
      overloadedWeekCount,
      busiestDay: busiestDay.date
    };
  }, [heatmap, dates]);

  const getColor = (intensity) => {
    if (intensity === 0) return '#e5e7eb'; // Gray
    if (intensity <= 30) return '#16a34a'; // Deep green
    if (intensity <= 50) return '#4ade80'; // Light green
    if (intensity <= 70) return '#facc15'; // Yellow
    if (intensity <= 85) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const summaryData = heatmap.map(emp => ({
        name: emp.name,
        peakWorkload: Math.max(...emp.dailyWorkload.map(d => d.intensity)),
        overloadedDays: emp.dailyWorkload.filter(d => d.intensity > 80).length,
        availableDays: emp.dailyWorkload.filter(d => d.intensity < 40).length
      }));

      const prompt = `You are a workforce analyst. Analyze this team workload data for the next 30 days and provide 3 specific actionable insights.

      Data: ${JSON.stringify(summaryData)}

      Return ONLY a JSON array with no markdown:
      [
        {
          "insight": "one sentence observation",
          "recommendation": "one sentence action to take",
          "urgency": "high" | "medium" | "low",
          "affectedEmployee": "employee name or 'Team'"
        }
      ]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || `API Error: ${response.status}`);
      }

      if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API");
      }

      const text = result.candidates[0].content.parts[0].text;
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsedInsights = JSON.parse(cleanText);
      setInsights(Array.isArray(parsedInsights) ? parsedInsights : []);
      showToast("AI Insights generated successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate insights.", "error");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Neural Workloads...</p>
      </div>
    );
  }

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => [0, 6].includes(date.getDay());

  return (
    <div className="max-w-full space-y-8 pb-20">
      <header className="mb-10 lg:flex items-end justify-between gap-6 overflow-x-hidden">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-100 mb-2 tracking-tight">Team Workload</h1>
          <p className="text-gray-500 font-medium">Predictive capacity visualization across the next 30 days.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 lg:mt-0 text-[10px] text-gray-500 font-black uppercase tracking-widest bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           Real-time Sync Active
        </div>
      </header>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Most Loaded" value={stats.busiestEmp.peak + '%'} sub={stats.busiestEmp.name} color="text-red-400" />
          <StatCard label="Fully Available Today" value={stats.availableTodayCount} sub="Specialists < 40%" color="text-emerald-400" />
          <StatCard label="Overloaded 7D" value={stats.overloadedWeekCount} sub="Specialists > 80%" color="text-orange-400" />
          <StatCard label="Busiest Day" value={stats.busiestDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} sub="Peak aggregate load" color="text-purple-400" />
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Filter Role</span>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-black/40 border border-gray-800 text-gray-300 text-xs font-bold rounded-xl px-4 py-2 outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
            >
              {['All Roles', 'AI Engineer', 'Data Scientist', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'AI Researcher'].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setShowWeekends(!showWeekends)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showWeekends ? 'bg-purple-900/20 border-purple-500/30 text-purple-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
          >
            {showWeekends ? 'Show Weekends' : 'Hide Weekends'}
          </button>

          <button 
            onClick={() => setShowOnlyOverloaded(!showOnlyOverloaded)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showOnlyOverloaded ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
          >
            Show Only Overloaded
          </button>
        </div>

        <div className="text-[10px] text-gray-600 font-medium flex items-center gap-2">
           <svg className="w-4 h-4 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
           Scroll to see more days
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="relative overflow-hidden bg-gray-900/40 border border-gray-800 rounded-[2.5rem] shadow-2xl">
        <div className="overflow-x-auto scroller">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="sticky left-0 z-20 bg-gray-950 p-6 text-left min-w-[160px] border-r border-gray-800 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                  Employee
                </th>
                {displayDates.filter(d => showWeekends || !isWeekend(d)).map((date, i) => (
                  <th key={i} className={`p-4 border-r border-gray-800/50 min-w-[50px] transition-colors ${isToday(date) ? 'border-t-2 border-t-purple-500' : ''} ${isWeekend(date) ? 'bg-gray-800/20' : ''}`}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-600 font-black">{date.toLocaleDateString('en-US', { day: 'numeric' })}</span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${isToday(date) ? 'text-purple-400' : 'text-gray-700'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHeatmap.map((emp, empIdx) => (
                <tr key={emp.id} className="border-b border-gray-800/50 hover:bg-gray-800/10 transition-colors group">
                  <td className="sticky left-0 z-20 bg-gray-950 p-6 border-r border-gray-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
                      {emp.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <h4 className="text-gray-200 text-xs font-black uppercase tracking-tight truncate max-w-[120px]">{emp.name}</h4>
                      <p className="text-[9px] text-gray-600 font-medium uppercase">{emp.role}</p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black ${emp.current_workload_percent > 80 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {emp.current_workload_percent}% LOAD
                      </span>
                    </div>
                  </td>
                  {emp.dailyWorkload.filter((d) => displayDates.some(dd => dd.getTime() === d.date.getTime())).filter((d) => showWeekends || !isWeekend(d.date)).map((day, dayIdx) => (
                    <td key={dayIdx} className="p-2 border-r border-gray-800/30">
                      <div 
                        className="relative w-8 h-8 rounded-lg mx-auto transition-all duration-700 animate-fade-in hover:scale-110 hover:shadow-lg cursor-pointer group/cell"
                        style={{ 
                          backgroundColor: getColor(day.intensity),
                          animationDelay: `${dayIdx * 15}ms`,
                          opacity: 0,
                          animation: 'fadeIn 0.5s forwards'
                        }}
                      >
                        {day.isOverdue && (
                           <div className="absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center rotate-45">
                             <div className="w-full h-0.5 bg-red-400/60 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                           </div>
                        )}
                        
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl opacity-0 group-hover/cell:opacity-100 pointer-events-none z-[100] transition-opacity">
                          <p className="text-[10px] text-white font-black uppercase mb-1">{emp.name}</p>
                          <p className="text-[9px] text-gray-500 font-medium mb-2">{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center bg-gray-900 px-2 py-1 rounded-md">
                               <span className="text-[8px] text-gray-600 font-bold uppercase">Workload</span>
                               <span className="text-[10px] text-white font-black">{day.intensity}%</span>
                             </div>
                             {day.tasks.length > 0 && (
                               <div className="space-y-1">
                                 <p className="text-[8px] text-purple-400 font-black uppercase tracking-widest mt-2">Active Tasks</p>
                                 {day.tasks.map((task, i) => (
                                   <p key={i} className="text-[8px] text-gray-400 font-medium truncate">• {task}</p>
                                 ))}
                               </div>
                             )}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-950 border-r border-b border-gray-800 rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-800">
        <LegendItem color="#16a34a" label="Available (0-30%)" />
        <LegendItem color="#4ade80" label="Light load (31-50%)" />
        <LegendItem color="#facc15" label="Moderate (51-70%)" />
        <LegendItem color="#f97316" label="Heavy (71-85%)" />
        <LegendItem color="#ef4444" label="Overloaded (86-100%)" />
        <LegendItem color="#e5e7eb" label="No assignments" />
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded shadow-inner rotate-45 border-t-2 border-t-red-400/60 bg-gray-800"></div>
           <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Task Overdue</span>
        </div>
      </div>

      {/* AI Insights Panel */}
      <section className="mt-16 space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <span className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </span>
             Agent Workload Insights
           </h3>
           <button 
             onClick={handleGenerateInsights}
             disabled={isGeneratingInsights}
             className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-500/10 disabled:opacity-50 flex items-center gap-3"
           >
             {isGeneratingInsights ? (
               <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 Analyzing Data...
               </>
             ) : 'Generate Insights'}
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.length === 0 ? (
             <div className="col-span-full py-16 text-center bg-gray-900/20 border-2 border-dashed border-gray-800 rounded-[2.5rem]">
               <p className="text-gray-600 font-bold">No insights generated yet. Click to analyze 30-day capacity.</p>
             </div>
          ) : (
            insights.map((insight, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] space-y-4 hover:border-purple-500/30 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.49c-.32.18-.72.18-1.04 0l-7.97-4.49C3.21 17.21 3 16.88 3 16.5v-9c0-.38.21-.71.53-.88l7.97-4.49c.32-.18.72-.18 1.04 0l7.97 4.49c.32.18.53.51.53.88v9z"/></svg>
                </div>
                <div className="flex justify-between items-start">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    insight.urgency === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                    insight.urgency === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {insight.urgency} Urgency
                  </span>
                  <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {insight.affectedEmployee}
                  </span>
                </div>
                <h4 className="text-gray-100 font-bold text-sm leading-relaxed">{insight.insight}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{insight.recommendation}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
        .scroller::-webkit-scrollbar {
          height: 6px;
        }
        .scroller::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .scroller::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.2);
          border-radius: 10px;
        }
        .scroller::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:bg-gray-800/40 transition-colors">
      <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-1">{label}</p>
      <p className={`text-3xl font-black ${color} mb-1 transition-all group-hover:scale-105 origin-left`}>{value}</p>
      <p className="text-gray-600 text-[10px] font-bold uppercase truncate">{sub}</p>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded shadow-inner" style={{ backgroundColor: color }}></div>
      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}
