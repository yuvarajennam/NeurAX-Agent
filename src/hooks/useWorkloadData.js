import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useWorkloadData() {
  const [employees, setEmployees] = useState([]);
  const [plans, setPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qEmployees = query(collection(db, 'employees'));
    const qPlans = query(collection(db, 'agentPlans'));
    const qProjects = query(collection(db, 'projects'));

    const unsubEmp = onSnapshot(qEmployees, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPlans = onSnapshot(qPlans, (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProj = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubEmp();
      unsubPlans();
      unsubProj();
    };
  }, []);

  useEffect(() => {
    if (employees.length && plans.length) {
      setLoading(false);
    }
  }, [employees, plans]);

  const calculateWorkload = (daysCount = 30) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dates = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    const heatmap = employees.map(emp => {
      const empWorkload = dates.map(date => {
        let activeTasksCount = 0;
        let activeTaskNames = [];
        let isOverdue = false;

        plans.forEach(plan => {
          const project = projects.find(p => p.id === plan.project_id || p.project_id === plan.project_id);
          const assignments = plan.assignments || [];
          
          assignments.forEach(asmt => {
            if (asmt.employee_id === emp.id || asmt.employee_id === emp.employee_id) {
              if (asmt.status === 'completed') return;

              const assignedAt = asmt.assignedAt?.toDate ? asmt.assignedAt.toDate() : new Date();
              const estDays = asmt.estimated_days || 30;
              const deadlineDate = new Date(assignedAt);
              deadlineDate.setDate(assignedAt.getDate() + estDays);

              const startDate = new Date(assignedAt);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(deadlineDate);
              endDate.setHours(23, 59, 59, 999);

              if (date >= startDate && date <= endDate) {
                activeTasksCount++;
                activeTaskNames.push(asmt.task_name || 'Unnamed Task');
                
                // Check if overdue
                if (date > endDate && asmt.status !== 'completed') {
                  isOverdue = true;
                }
              }
            }
          });
        });

        const base = emp.current_workload_percent || 0;
        let added = 0;
        if (activeTasksCount === 1) added = 15;
        else if (activeTasksCount === 2) added = 30;
        else if (activeTasksCount >= 3) added = 45;

        const totalIntensity = Math.min(100, base + added);

        return {
          date: new Date(date),
          intensity: totalIntensity,
          tasks: activeTaskNames,
          isOverdue: isOverdue || (date > today && activeTasksCount > 0 && date > today) // Simplification for overdue
        };
      });

      return {
        ...emp,
        dailyWorkload: empWorkload
      };
    });

    return { dates, heatmap };
  };

  return { employees, plans, projects, loading, calculateWorkload };
}
