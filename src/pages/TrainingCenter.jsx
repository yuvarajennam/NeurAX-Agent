import { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Papa from 'papaparse';
import { generateFictionalEmployees, generateFictionalHistory } from '../services/dataGenerator';
import { validateDataset } from '../services/validationService';
import Toast from '../components/Toast';

export default function TrainingCenter() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleResetLogs = () => setLogs([]);

  const processTraining = async (data, type) => {
    setIsTraining(true);
    setProgress(0);
    addLog(`Starting training sequence for ${type}...`);

    // Pre-filter empty rows and noise
    const cleanData = data.filter(row => {
      const values = Object.values(row).filter(v => v !== null && v !== undefined && v !== '');
      return values.length > 1; // Must have at least two populated columns
    });

    if (cleanData.length === 0) {
      addLog("ERROR: No valid data rows found in CSV.");
      setIsTraining(false);
      return;
    }

    const validation = validateDataset(cleanData, type);
    if (!validation.isValid) {
      validation.errors.forEach(err => addLog(`ERROR: ${err}`));
      showToast("Validation failed. Check logs.", "error");
      setIsTraining(false);
      return;
    }

    // Normalize data (ensure id field exists and provide defaults)
    const normalizedData = data.filter(r => Object.keys(r).length > 1).map(item => {
      let normalized = { ...item };
      
      if (type === 'employees') {
        normalized.id = item.id || item.employee_id || item.employeeId;
        normalized.current_workload_percent = item.current_workload_percent || 0;
        
        // Handle skills (CSV might provide them as a semicolon/comma separated string)
        if (typeof item.skills === 'string') {
          normalized.skills = item.skills.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        } else if (!Array.isArray(item.skills)) {
          normalized.skills = [];
        }
      }
      
      if (type === 'history' || type === 'projectHistory') {
        normalized.project_id = item.project_id || item.id || item.projectId;
        normalized.deadline_days = item.deadline_days || item.deadline || item.duration || 30;
        if (!item.success_score) normalized.success_score = 85; 
        if (!item.completion_days) normalized.completion_days = normalized.deadline_days;
      }
      
      return normalized;
    });

    addLog(`Neural Port Sanitized. Ingesting ${normalizedData.length} records...`);
    
    try {
      const batch = writeBatch(db);
      const collectionName = type === 'employees' ? 'employees' : 'projectHistory';
      
      normalizedData.forEach((item, index) => {
        const id = type === 'employees' ? item.id : item.project_id;
        const ref = doc(db, collectionName, id);
        batch.set(ref, {
          ...item,
          trainedAt: new Date(),
          isSynthetic: !!(item.id?.includes('SYNTH') || item.project_id?.includes('SYNTH'))
        });
        
        if (index % 5 === 0) setProgress(Math.round((index / normalizedData.length) * 100));
      });

      await batch.commit();
      setProgress(100);
      addLog(`SUCCESS: ${type} dataset integrated into neural engine.`);
      showToast(`${type} training complete!`, "success");
    } catch (err) {
      addLog(`CRITICAL ERROR: ${err.message}`);
      showToast("Training interrupted.", "error");
    } finally {
      setIsTraining(false);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => {
        // Aggressive sanitization: remove BOM, non-alphanumeric, etc.
        return header
          .replace(/^\uFEFF/, '') // Remove BOM
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_') // Replace anything weird with underscore
          .replace(/_+/g, '_'); // Collapse multiple underscores
      },
      complete: (results) => {
        processTraining(results.data, type);
      },
      error: (err) => {
        addLog(`Parse Error: ${err.message}`);
        showToast("CSV parsing failed.", "error");
      }
    });
  };

  const handleGenerateSynth = (type) => {
    const data = type === 'employees' ? generateFictionalEmployees(8) : generateFictionalHistory(12);
    processTraining(data, type);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Employee Data Portal</h1>
        <p className="text-gray-500 font-medium">Refine the NeurAX neural engine by expanding its knowledge base.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ingestion Zones */}
        <div className="space-y-6">
          <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl group-hover:bg-purple-600/20 transition-all"></div>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </span>
              Talent Pool Expansion
            </h3>

            <div className="space-y-4">
              <label className="block w-full cursor-pointer group/btn">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'employees')}
                  disabled={isTraining}
                />
                <div className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover/btn:border-purple-500/50 transition-all">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-sm text-gray-500 font-medium">Upload Employee CSV</span>
                </div>
              </label>

              <button 
                onClick={() => handleGenerateSynth('employees')}
                disabled={isTraining}
                className="w-full py-4 bg-gray-800/50 hover:bg-purple-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Fetch Talents
              </button>
            </div>
          </section>

          <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-3xl group-hover:bg-emerald-600/20 transition-all"></div>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </span>
              History Optimization
            </h3>

            <div className="space-y-4">
              <label className="block w-full cursor-pointer group/btn">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'history')}
                  disabled={isTraining}
                />
                <div className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover/btn:border-emerald-500/50 transition-all">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-sm text-gray-500 font-medium">Upload Project History CSV</span>
                </div>
              </label>

              <button 
                onClick={() => handleGenerateSynth('history')}
                disabled={isTraining}
                className="w-full py-4 bg-gray-800/50 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Fetch History
              </button>
            </div>
          </section>
        </div>

        {/* Console / Status */}
        <div className="bg-black border border-gray-800 rounded-3xl flex flex-col overflow-hidden h-full min-h-[500px]">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20"></div>
              </div>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Neural Engine Console</span>
            </div>
            <button onClick={handleResetLogs} className="text-[9px] text-gray-600 hover:text-white uppercase font-black">Clear</button>
          </div>

          <div className="flex-1 p-6 font-mono text-xs overflow-y-auto space-y-2 scroller">
            {isTraining && (
               <div className="mb-6 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-purple-400 font-bold uppercase tracking-tighter">Syncing Neural Paths...</span>
                   <span className="text-white font-black">{progress}%</span>
                 </div>
                 <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-purple-500 transition-all duration-300 shadow-[0_0_10px_purple]" 
                      style={{ width: `${progress}%` }}
                   ></div>
                 </div>
               </div>
            )}

            {logs.length === 0 ? (
              <p className="text-gray-700 italic">No output. Waiting for ingestion sequence...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`
                  ${log.includes('ERROR') ? 'text-red-400' : 
                    log.includes('SUCCESS') ? 'text-emerald-400' : 
                    log.includes('Starting') ? 'text-purple-400' : 'text-gray-500'}
                `}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
