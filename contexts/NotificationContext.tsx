import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationColor = 'green' | 'red';

type Notification = {
  message: string;
  color: NotificationColor;
};

interface NotificationContextType {
  notification: Notification | null;
  showNotification: (notification: Notification) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notification: null,
  showNotification: () => {},
  hideNotification: () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const showNotification = useCallback(
    ({ message, color }: Notification) => {
      // Clear any existing timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      setNotification({ message, color });

      // Auto-hide after 7 seconds
      const timeout = setTimeout(() => {
        setNotification(null);
        setHideTimeout(null);
      }, 7000);

      setHideTimeout(timeout);
    },
    [hideTimeout]
  );

  const hideNotification = useCallback(() => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setNotification(null);
  }, [hideTimeout]);

  return (
    <NotificationContext.Provider
      value={{ notification, showNotification, hideNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);

