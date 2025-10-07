import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

interface LayoutContextValue {
  contextInfo: {
    communityName?: string;
    communityId?: string;
    feedName?: string;
  };
  setContextInfo: (info: LayoutContextValue['contextInfo']) => void;
  clearContextInfo: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [contextInfo, setContextInfo] = useState<LayoutContextValue['contextInfo']>({});

  const updateContextInfo = useCallback((info: LayoutContextValue['contextInfo']) => {
    setContextInfo(info);
  }, []);

  const clearContextInfo = useCallback(() => {
    setContextInfo({});
  }, []);

  return (
    <LayoutContext.Provider
      value={{ contextInfo, setContextInfo: updateContextInfo, clearContextInfo }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
