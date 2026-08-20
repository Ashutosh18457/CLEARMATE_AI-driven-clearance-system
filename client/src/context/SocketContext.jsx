import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem('clearmate_token') || localStorage.getItem('clearmate_token') || localStorage.getItem('token');
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Determine backend socket URL
    const backendUrl =
      import.meta.env.VITE_API_URL?.replace('/api', '') ||
      'http://localhost:5000';

    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('new_notification', (data) => {
      const notif = data?.notification || data;
      if (notif) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-surface shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-brand p-4`}
            >
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-ink-primary">
                      🔔 {notif.title || 'New Notification'}
                    </p>
                    <p className="mt-1 text-xs text-ink-secondary line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-border-subtle ml-3 pl-3">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full text-xs font-semibold text-brand hover:text-brand-hover focus:outline-none"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }
    });

    newSocket.on('new_task', (data) => {
      const task = data?.task;
      const assignedBy = data?.assignedBy;
      if (task) {
        toast.success(
          `📋 Task Assigned by ${assignedBy?.name || 'Teacher'}: "${task.title}"`,
          { duration: 7000 }
        );
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  return context || { socket: null, isConnected: false };
}
