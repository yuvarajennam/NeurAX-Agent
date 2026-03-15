import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navClass = ({ isActive }) => 
    `block px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-purple-900/40 text-purple-300 font-medium border border-purple-500/20' : 'hover:bg-gray-800 text-gray-400'}`;

  const navItems = [
    { to: '/', label: 'Project Dashboard' },
    { to: '/employees', label: 'Employees' },
    { to: '/training', label: 'Employee Data' },
    { to: '/heatmap', label: 'Workload Heatmap' },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center z-50">
        <Link to="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-purple-700">
          NeurAX
        </Link>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white p-2"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Navigation (Sidebar/Menu) */}
      <nav className={`
        fixed inset-y-0 left-0 w-64 bg-gray-950 border-r border-gray-900 h-screen flex flex-col z-50 transition-transform duration-300 shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-8 mb-6 mt-8 lg:mt-0">
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-purple-700">
            NeurAX Agent
          </h1>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-1">Autonomous Ops</p>
        </div>

        <div className="px-4 flex-1 flex flex-col gap-2">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={navClass}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="p-8 border-t border-gray-900 space-y-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-red-500/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout session
          </button>

          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">System Active</span>
          </div>
          <div className="text-[10px] text-gray-600 px-2 flex justify-between">
            <span>v1.0.4-beta</span>
            <span className="opacity-40">{currentUser?.email?.split('@')[0]}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
