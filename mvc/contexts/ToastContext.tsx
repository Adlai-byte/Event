import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastNotification } from '../components/ToastNotification';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onPress?: () => void;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions & { visible: boolean }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((options: ToastOptions) => {
    setToast({ ...options, visible: true });
  }, []);

  const handleClose = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={handleClose}
        onPress={toast.onPress}
      />
    </ToastContext.Provider>
  );
};
