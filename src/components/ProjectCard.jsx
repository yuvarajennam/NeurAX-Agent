import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();
  const { project_id, name, status, deadline_days, priority_score, required_skills } = project;

  // Priority mapping
  const getPriorityInfo = (score) => {
    if (score >= 4) return { label: 'High', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    if (score >= 2) return { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    return { label: 'Low', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
  };

  // Status mapping
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const priorityInfo = getPriorityInfo(priority_score);
  const skills = Array.isArray(required_skills) ? required_skills : [];

  return (
    <div 
      onClick={() => navigate(`/project/${project_id}`)}
      className="group bg-gray-900/50 border border-gray-800 p-5 rounded-xl hover:border-purple-500/50 hover:bg-gray-800/80 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/5"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors">
          {name}
        </h3>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${priorityInfo.color}`}>
          {priorityInfo.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {skills.map((skill, idx) => (
          <span key={idx} className="bg-purple-900/30 text-purple-300 text-[11px] px-2 py-0.5 rounded-full border border-purple-500/20 shadow-sm">
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/50">
        <div className="flex flex-col">
          <span className="text-gray-500 text-[10px] uppercase tracking-widest leading-none mb-1">Deadline</span>
          <span className="text-sm font-medium text-gray-300">{deadline_days} days left</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${getStatusColor(status)}`}>
          {status || 'Pending'}
        </span>
      </div>
    </div>
  );
}
