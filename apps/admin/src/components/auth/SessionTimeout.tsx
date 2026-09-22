"use client";

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import useAdminAuthStore from '@/store/adminAuthStore';

interface SessionTimeoutProps {
  // For demo: shorter timeout (30 seconds instead of 30 minutes)
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export default function SessionTimeout({ 
  timeoutMinutes = 30, 
  warningMinutes = 5 
}: SessionTimeoutProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const { logout, checkAuth } = useAdminAuthStore();

  useEffect(() => {
    // For demo purposes, use shorter intervals (30 seconds timeout, 5 seconds warning)
    const demoMode = process.env.NODE_ENV === 'development';
    const actualTimeout = demoMode ? 30 : timeoutMinutes * 60; // 30 seconds in demo
    const actualWarning = demoMode ? 5 : warningMinutes * 60; // 5 seconds warning in demo

    let timeoutInterval: NodeJS.Timeout;
    let warningTimeout: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;

    const startSessionTimer = () => {
      // Clear any existing timers
      clearTimeout(warningTimeout);
      clearTimeout(timeoutInterval);
      clearInterval(countdownInterval);

      // Set warning timer
      warningTimeout = setTimeout(() => {
        if (checkAuth()) {
          setShowWarning(true);
          setTimeLeft(actualWarning);

          // Start countdown
          countdownInterval = setInterval(() => {
            setTimeLeft(prev => {
              if (prev === null || prev <= 1) {
                // Time's up - logout
                logout();
                setShowWarning(false);
                clearInterval(countdownInterval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }, (actualTimeout - actualWarning) * 1000);

      // Set logout timer
      timeoutInterval = setTimeout(() => {
        if (checkAuth()) {
          logout();
          setShowWarning(false);
        }
      }, actualTimeout * 1000);
    };

    const resetTimer = () => {
      setShowWarning(false);
      setTimeLeft(null);
      startSessionTimer();
    };

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Start initial timer
    startSessionTimer();

    // Cleanup
    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(timeoutInterval);
      clearInterval(countdownInterval);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMinutes, warningMinutes, logout, checkAuth]);

  const extendSession = () => {
    setShowWarning(false);
    setTimeLeft(null);
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-500">
              Your session will expire due to inactivity
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-2xl font-mono font-bold text-red-600">
              {Math.floor((timeLeft || 0) / 60)}:{((timeLeft || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Click "Stay Logged In" to extend your session
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={extendSession}
            className="flex-1 bg-brand text-brandInk px-4 py-2 rounded-lg hover:bg-brandDark transition-colors font-medium"
          >
            Stay Logged In
          </button>
          <button
            onClick={logout}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Logout Now
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Demo Mode: 30s timeout, 5s warning
          </p>
        )}
      </div>
    </div>
  );
}