'use client';

import { useEffect, useState } from 'react';

function getCurrentOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getCurrentOnlineStatus);

  useEffect(() => {
    function handleOnlineStatusChange() {
      setIsOnline(getCurrentOnlineStatus());
    }

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  return isOnline;
}
