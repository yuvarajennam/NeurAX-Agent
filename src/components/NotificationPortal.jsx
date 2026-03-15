import { useState, useEffect } from 'react';

/**
 * NotificationPortal
 * Simulates a real-time notification feed (Slack/Email style)
 * when assignments are confirmed.
 */
export default function NotificationPortal({ notifications, onComplete }) {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < notifications.length) {
      const timer = setTimeout(() => {
        setVisibleNotifications(prev => [notifications[currentIndex], ...prev]);
        setCurrentIndex(prev => prev + 1);
      }, 1200); // Wait 1.2s between each notification

      return () => clearTimeout(timer);
    } else if (notifications.length > 0) {
      // Auto-close after all notifications are shown
      const closeTimer = setTimeout(() => {
        onComplete();
      }, 5000);
      return () => clearTimeout(closeTimer);
    }
  }, [currentIndex, notifications, onComplete]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      {visibleNotifications.map((note, i) => (
        <div 
          key={i} 
          className="bg-gray-950/90 backdrop-blur-2xl border border-purple-500/30 p-4 rounded-2xl shadow-2xl animate-notification-slide-in pointer-events-auto group"
        >
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs ${
              note.type === 'slack' ? 'bg-[#4A154B] text-white' : 'bg-blue-600 text-white'
            }`}>
              {note.type === 'slack' ? 'S' : '@'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {note.type === 'slack' ? 'Slack' : 'Internal Email'}
                </span>
                <span className="text-[9px] text-gray-700">Just now</span>
              </div>
              <p className="text-xs text-white font-medium leading-relaxed">
                <span className="text-purple-400 font-bold">Assignment Alert:</span> {note.message}
              </p>
            </div>
          </div>
          {/* Progress bar for auto-close (only for the oldest ones) */}
          <div className="absolute bottom-0 left-0 h-1 bg-purple-500/20 rounded-b-2xl overflow-hidden w-full">
            <div className="h-full bg-purple-500/50 animate-progress-shrink"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
