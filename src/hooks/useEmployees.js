import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useEmployees() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const employeesCol = collection(db, 'employees');
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      employeesCol,
      (snapshot) => {
        const employeesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(employeesList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching employees:', err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}
