import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  writeBatch, 
  getDoc, 
  getDocs,
  collection,
  arrayRemove, 
  arrayUnion 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Saves the AI-generated project plan to Firestore and updates project status
 * @param {string} projectId 
 * @param {Object} plan 
 */
export const saveAgentPlan = async (projectId, plan) => {
  const batch = writeBatch(db);
  
  // 1. Save plan to agentPlans collection
  const planRef = doc(db, 'agentPlans', projectId);
  batch.set(planRef, plan);
  
  // 2. Update project status
  const projectRef = doc(db, 'projects', projectId);
  batch.update(projectRef, {
    status: 'assigned',
    assignedAt: serverTimestamp()
  });
  
  return batch.commit();
};

/**
 * Updates the status of a specific task assignment within a plan
 * @param {string} projectId 
 * @param {string} employeeId 
 * @param {string} newStatus - "not_started", "in_progress", "completed"
 */
export const updateTaskStatus = async (projectId, employeeId, newStatus) => {
  const planRef = doc(db, 'agentPlans', projectId);
  const planSnap = await getDoc(planRef);
  
  if (!planSnap.exists()) {
    throw new Error('Agent plan not found');
  }
  
  const planData = planSnap.data();
  const assignments = [...(planData.assignments || [])];
  
  const index = assignments.findIndex(a => a.employee_id === employeeId);
  if (index === -1) {
    throw new Error(`Assignment for employee ${employeeId} not found`);
  }
  
  assignments[index] = { ...assignments[index], status: newStatus };
  
  return updateDoc(planRef, { assignments });
};

/**
 * Completes a task, calculates rating, and updates employee stats
 */
export const completeTask = async (projectId, employeeId, estimatedDays) => {
  console.log(`NeurAX: Completing task for project ${projectId}, employee ${employeeId}`);
  const planRef = doc(db, 'agentPlans', projectId);
  const planSnap = await getDoc(planRef);
  
  if (!planSnap.exists()) throw new Error('Plan not found');
  
  const planData = planSnap.data();
  const assignments = [...(planData.assignments || [])];
  const assignmentIndex = assignments.findIndex(a => a.employee_id === employeeId);
  if (assignmentIndex === -1) throw new Error('Assignment not found');
  
  const assignment = assignments[assignmentIndex];

  // 1. Calculate timing
  const now = new Date();
  const assignedAt = assignment.assignedAt?.toDate() || new Date();
  const diffTime = Math.abs(now - assignedAt);
  const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const delay = actualDays - (estimatedDays || 30);

  console.log(`NeurAX: Performance - Actual: ${actualDays}, Est: ${estimatedDays}, Delay: ${delay}`);

  // 2. Performance Formula
  let stars = 5;
  if (delay > 10) stars = 1;
  else if (delay > 5) stars = 2;
  else if (delay > 2) stars = 3;
  else if (delay > 0) stars = 4;

  // 3. Update Assignment
  assignments[assignmentIndex] = {
    ...assignment,
    status: 'completed',
    completedAt: now,
    actual_days_taken: actualDays,
    taskRating: stars
  };

  await updateDoc(planRef, { assignments });
  console.log('NeurAX: Updated plan assignments.');

  // 4. Update Employee
  const empRef = doc(db, 'employees', employeeId);
  console.log(`NeurAX: Fetching employee doc with ID: ${employeeId}`);
  const empSnap = await getDoc(empRef);
  if (empSnap.exists()) {
    const empData = empSnap.data();
    console.log(`NeurAX: Found employee: ${empData.name}. Current tasks: ${empData.totalTasksCompleted || 0}`);
    const history = empData.ratingHistory || [];
    const newHistoryEntry = {
      taskName: assignment.task_name,
      projectId,
      estimatedDays,
      actualDays,
      stars,
      completedAt: now.toISOString()
    };

    const newHistory = [...history, newHistoryEntry];
    const totalStars = newHistory.reduce((sum, h) => sum + h.stars, 0);
    const newRating = Number((totalStars / newHistory.length).toFixed(1));

    await updateDoc(empRef, {
      rating: newRating,
      totalTasksCompleted: (empData.totalTasksCompleted || 0) + 1,
      onTimeCount: (empData.onTimeCount || 0) + (delay <= 0 ? 1 : 0),
      lateCount: (empData.lateCount || 0) + (delay > 0 ? 1 : 0),
      ratingHistory: newHistory
    });
    console.log(`NeurAX: Updated employee ${employeeId} rating to ${newRating}`);
  }

  // 5. Check if project is complete
  const allCompleted = assignments.every(a => a.status === 'completed');
  if (allCompleted) {
    console.log('NeurAX: Project fully completed! Updating project status.');
    await updateDoc(doc(db, 'projects', projectId), {
      status: 'completed',
      completedAt: serverTimestamp()
    });
  }
};

/**
 * Initializes rating fields for existing employees
 */
export const initializeEmployeeRating = async () => {
  const querySnapshot = await getDocs(collection(db, 'employees'));
  const batch = writeBatch(db);
  let hasUpdates = false;

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.rating === undefined) {
      const ref = doc(db, 'employees', docSnap.id);
      batch.update(ref, {
        rating: 3.0,
        totalTasksCompleted: 0,
        onTimeCount: 0,
        lateCount: 0,
        ratingHistory: []
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) await batch.commit();
};
