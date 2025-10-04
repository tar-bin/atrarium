import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loginToPDS, getSessionDID, getSessionHandle } from '@/lib/pds';
import type { UserSession } from '@/types';

interface PDSContextValue {
  session: UserSession;
  login: (handle: string, password: string) => Promise<void>;
  logout: () => void;
}

const PDSContext = createContext<PDSContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'pds_session';

interface StoredSession {
  did: string;
  handle: string;
}

export function PDSProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>({
    agent: null,
    did: null,
    handle: null,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    const storedSessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSessionStr) {
      try {
        const storedSession: StoredSession = JSON.parse(storedSessionStr);
        // Note: We can't restore the agent from localStorage (it has methods)
        // The user will need to login again for a fresh agent
        // But we can show they were previously logged in
        setSession({
          agent: null,
          did: storedSession.did,
          handle: storedSession.handle,
          isAuthenticated: false, // Set to false since we don't have agent
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  const login = async (handle: string, password: string) => {
    try {
      const agent = await loginToPDS(handle, password);
      const did = getSessionDID(agent);
      const sessionHandle = getSessionHandle(agent);

      if (!did || !sessionHandle) {
        throw new Error('Failed to retrieve session information');
      }

      const newSession: UserSession = {
        agent,
        did,
        handle: sessionHandle,
        isAuthenticated: true,
      };

      setSession(newSession);

      // Store session metadata (not the agent itself)
      const sessionToStore: StoredSession = {
        did,
        handle: sessionHandle,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToStore));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setSession({
      agent: null,
      did: null,
      handle: null,
      isAuthenticated: false,
    });
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return (
    <PDSContext.Provider value={{ session, login, logout }}>
      {children}
    </PDSContext.Provider>
  );
}

export function usePDS() {
  const context = useContext(PDSContext);
  if (context === undefined) {
    throw new Error('usePDS must be used within a PDSProvider');
  }
  return context;
}
