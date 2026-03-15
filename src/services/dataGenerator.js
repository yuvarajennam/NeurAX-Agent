/**
 * Utility Service for generating fictional/synthetic employee and project data
 * for AI training and stress testing.
 */

const SKILL_POOL = [
  'React', 'Node.js', 'Python', 'ML', 'LLM', 'NLP', 'APIs', 'RAG', 
  'Firebase', 'DevOps', 'UI/UX', 'Audit', 'Security', 'Data Analysis',
  'Three.js', 'React Native', 'Data Engineering', 'TypeScript'
];

const NAMES = [
  'Arias Thorne', 'Elena Vance', 'Cyrus Sterling', 'Lila Kael', 
  'Ronan Brooks', 'Sloane Hunter', 'Jaxson Miller', 'Maya Rossi'
];

export const generateFictionalEmployees = (count = 5) => {
  return Array.from({ length: count }, (_, i) => {
    const skillsCount = Math.floor(Math.random() * 3) + 2; // 2-4 skills
    const shuffledSkills = [...SKILL_POOL].sort(() => 0.5 - Math.random());
    const skills = shuffledSkills.slice(0, skillsCount);
    
    return {
      id: `EMP_SYNTH_${100 + i}`,
      name: NAMES[i % NAMES.length] + ' (Synth)',
      role: 'Synthetic Agent ' + (i + 1),
      experience_years: Math.floor(Math.random() * 10) + 1,
      current_workload_percent: Math.floor(Math.random() * 60), // Start with some workload
      skills: skills // Array format
    };
  });
};

export const generateFictionalHistory = (count = 10) => {
  const priorities = ['High', 'Medium', 'Low'];
  
  return Array.from({ length: count }, (_, i) => {
    const skillsCount = Math.floor(Math.random() * 3) + 2;
    const shuffledSkills = [...SKILL_POOL].sort(() => 0.5 - Math.random());
    const skills = shuffledSkills.slice(0, skillsCount);
    
    const deadline = Math.floor(Math.random() * 40) + 10;
    const completion = deadline - Math.floor(Math.random() * 10) + 5; // Can be early or late

    return {
      project_id: `HIST_SYNTH_${500 + i}`,
      project_name: `Synth Project ${i + 1}`,
      required_skills: skills,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      deadline_days: deadline,
      completion_days: completion,
      success_score: Math.floor(Math.random() * 40) + 60, // 60-100%
      team_size: Math.floor(Math.random() * 4) + 2
    };
  });
};
