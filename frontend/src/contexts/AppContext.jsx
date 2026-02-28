import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToData } from '../firebase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [appData, setAppData] = useState({
    summary: {},
    players: [],
    playerNames: [],
    defaultMultiPlayers: [],
    deletedPlayers: [],
    history: [],
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToData((data) => {
      setAppData(data);
      setIsConnected(true);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    appData,
    isConnected,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within AppProvider');
  }
  return context;
}
