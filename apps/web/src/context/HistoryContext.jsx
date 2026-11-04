import React, { createContext, useContext, useState, useEffect } from 'react';

const HistoryContext = createContext();

export function HistoryProvider({ children }) {
  const [sentTransfers, setSentTransfers] = useState(() => {
    try {
      const saved = localStorage.getItem('sendora_history_sent');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [receivedTransfers, setReceivedTransfers] = useState(() => {
    try {
      const saved = localStorage.getItem('sendora_history_received');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sendora_history_sent', JSON.stringify(sentTransfers));
    } catch (e) {}
  }, [sentTransfers]);

  useEffect(() => {
    try {
      localStorage.setItem('sendora_history_received', JSON.stringify(receivedTransfers));
    } catch (e) {}
  }, [receivedTransfers]);

  const addSentTransfer = (transfer) => {
    setSentTransfers(prev => {
      const filtered = prev.filter(t => t.id !== transfer.id);
      return [transfer, ...filtered].slice(0, 50); // Keep latest 50
    });
  };

  const removeSentTransfer = (id) => {
    setSentTransfers(prev => prev.filter(t => t.id !== id));
  };

  const addReceivedTransfer = (transfer) => {
    setReceivedTransfers(prev => {
      const filtered = prev.filter(t => t.id !== transfer.id);
      return [{ ...transfer, accessed_at: Math.floor(Date.now() / 1000) }, ...filtered].slice(0, 50);
    });
  };

  const removeReceivedTransfer = (id) => {
    setReceivedTransfers(prev => prev.filter(t => t.id !== id));
  };

  const clearAllHistory = () => {
    setSentTransfers([]);
    setReceivedTransfers([]);
    localStorage.removeItem('sendora_history_sent');
    localStorage.removeItem('sendora_history_received');
  };

  return (
    <HistoryContext.Provider
      value={{
        sentTransfers,
        receivedTransfers,
        addSentTransfer,
        removeSentTransfer,
        addReceivedTransfer,
        removeReceivedTransfer,
        clearAllHistory
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}

