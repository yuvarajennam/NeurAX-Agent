import { useState, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import StarRating from '../components/StarRating';

export default function Employees() {
  const { data: employees, loading, error } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const skillsArr = Array.isArray(emp.skills) ? emp.skills : 
                         (typeof emp.skills === 'string' ? emp.skills.split(/[;,]/).map(s => s.trim()) : []);
        
        const nameMatch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const skillsMatch = skillsArr.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
        return nameMatch || skillsMatch;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Sort by rating now
  }, [employees, searchQuery]);

  // Calculate stats
  const totalEmployees = employees.length;
  const availableCount = employees.filter(emp => (emp.current_workload_percent || 0) < 70).length;

  const getWorkloadColor = (percent) => {
    if (percent > 75) return 'bg-red-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getAvailabilityLabel = (percent) => {
    if (percent > 85) return { text: 'Overloaded', color: 'text-red-400' };
    if (percent > 65) return { text: 'Busy', color: 'text-yellow-400' };
    return { text: 'Available', color: 'text-emerald-400' };
  };

  const getPerformanceBadge = (rating, historyLength) => {
    if (!historyLength || historyLength === 0) return { text: 'New Employee', color: 'bg-gray-800 text-gray-400 border-gray-700' };
    if (rating >= 4.5) return { text: 'Top Performer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (rating >= 3.5) return { text: 'Reliable', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (rating >= 2.5) return { text: 'Average', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { text: 'Needs Improvement', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-1/4 mb-10"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500">Failed to load employees</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-0">
      <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2">Talent Network</h1>
          <p className="text-gray-500 font-medium">
            Currently tracking <span className="text-white font-bold">{totalEmployees}</span> specialists. 
            <span className="text-emerald-500 font-bold ml-1">{availableCount}</span> ready for new assignments.
          </p>
        </div>

        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-12 py-4 rounded-[1.5rem] focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 font-medium"
          />
          <svg className="w-5 h-5 absolute left-4.5 top-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEmployees.map((emp) => {
          const workload = emp.current_workload_percent || 0;
          const availability = getAvailabilityLabel(workload);
          const initials = emp.name?.split(' ').map(n => n[0]).join('') || '?';
          const badge = getPerformanceBadge(emp.rating, emp.ratingHistory?.length);

          return (
            <div key={emp.id} className="bg-gray-900/40 border border-gray-800 p-8 rounded-[2rem] hover:border-purple-500/30 transition-all group relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
              </div>

              <div className="flex flex-col mb-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500/20 to-purple-800/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-2xl shadow-lg">
                    {initials}
                  </div>
                  <div className="text-right">
                    <StarRating rating={emp.rating || 3.0} showNumber size="md" />
                    <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{emp.totalTasksCompleted || 0} Tasks Done</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-100 font-black text-xl leading-none mb-1 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{emp.name}</h3>
                  <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">{emp.role}</p>
                </div>
              </div>

              <div className="mb-6 flex items-center gap-2">
                 <span className={`text-[10px] font-black px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest ${badge.color}`}>
                    {badge.text}
                 </span>
                 <span className="bg-gray-800 text-gray-400 text-[10px] font-black px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest">
                  {emp.experience_years}Y Exp
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-8 h-12 overflow-hidden content-start">
                {(Array.isArray(emp.skills) ? emp.skills : 
                  (typeof emp.skills === 'string' ? emp.skills.split(/[;,]/).map(s => s.trim()) : [])
                ).map((skill, i) => (
                  <span key={`${emp.id}-skill-${i}`} className="bg-gray-800/30 text-gray-500 text-[10px] px-2 py-0.5 rounded-md border border-gray-700/50 font-bold group-hover:bg-purple-500/10 group-hover:text-purple-300 transition-colors">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-800/50 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-600 uppercase tracking-widest">
                   <span>Sync Status</span>
                   <span className="text-gray-400">{emp.onTimeCount || 0} On Time · {emp.lateCount || 0} Late</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black uppercase tracking-widest ${availability.color}`}>{availability.text}</span>
                    <span className="text-lg font-black text-white">{workload}%</span>
                  </div>
                  <div className="w-full bg-gray-950 p-[2px] h-3 rounded-full overflow-hidden border border-gray-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getWorkloadColor(workload)}`}
                      style={{ width: `${workload}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-900/10 border border-dashed border-gray-800 rounded-[2.5rem]">
            <p className="text-gray-600 font-black uppercase tracking-widest">No specialists found matching your query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
