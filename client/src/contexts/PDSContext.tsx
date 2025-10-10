import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { getSessionDID, getSessionHandle, loginToPDS, resumeSession } from '@/lib/pds';
import type { UserSession } from '@/types';

interface PDSContextValue {
  session: UserSession;
  agent: UserSession['agent'];
  login: (handle: string, password: string) => Promise<void>;
  logout: () => void;
}

const PDSContext = createContext<PDSContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'pds_session';

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
        const storedSessionData = JSON.parse(storedSessionStr);
        // Attempt to resume session with stored session data
        resumeSession(storedSessionData)
          .then(async (agent) => {
            const did = getSessionDID(agent);
            const handle = getSessionHandle(agent);
            if (did && handle && agent.session) {
              setSession({
                agent,
                did,
                handle,
                isAuthenticated: true,
              });

              // Re-exchange PDS JWT for fresh Atrarium JWT
              try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
                const response = await fetch(`${apiUrl}/api/auth/pds-login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessJwt: agent.session.accessJwt,
                    did,
                    handle,
                  }),
                });

                if (response.ok) {
                  const { accessJwt } = await response.json();
                  localStorage.setItem('auth_token', accessJwt);
                }
              } catch (_error) {
                // Continue with session even if JWT exchange fails
                // User can re-login if needed
              }
            } else {
              // Session data is invalid, clear it
              localStorage.removeItem(SESSION_STORAGE_KEY);
              localStorage.removeItem('auth_token');
            }
          })
          .catch((_error) => {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem('auth_token');
          });
      } catch (_error) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  const login = async (handle: string, password: string) => {
    const agent = await loginToPDS(handle, password);
    const did = getSessionDID(agent);
    const sessionHandle = getSessionHandle(agent);

    if (!did || !sessionHandle || !agent.session) {
      throw new Error('Failed to retrieve session information');
    }

    const newSession: UserSession = {
      agent,
      did,
      handle: sessionHandle,
      isAuthenticated: true,
    };

    setSession(newSession);

    // Store full session data for resumeSession
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(agent.session));

    // Exchange PDS JWT for Atrarium JWT
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const response = await fetch(`${apiUrl}/api/auth/pds-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessJwt: agent.session.accessJwt,
        did,
        handle: sessionHandle,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange PDS JWT for Atrarium JWT');
    }

    const { accessJwt } = await response.json();
    localStorage.setItem('auth_token', accessJwt);
  };

  const logout = () => {
    setSession({
      agent: null,
      did: null,
      handle: null,
      isAuthenticated: false,
    });
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('auth_token');
  };

  return (
    <PDSContext.Provider value={{ session, agent: session.agent, login, logout }}>
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
