import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth';
import { identifyUser, trackEvent, EVENTS } from '../utils/analytics';
import type { User, Occupant } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedOccupant: Occupant | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  selectOccupant: (occupant: Occupant) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedOccupant, setSelectedOccupant] = useState<Occupant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);

      // Identify user for analytics
      identifyUser(userData.id, {
        email: userData.email,
        isAdmin: userData.isAdmin,
        roomNumber: userData.room?.roomNumber,
        unitName: userData.room?.unit?.name,
      });

      // Auto-select occupant if only one
      if (userData.occupants?.length === 1) {
        setSelectedOccupant(userData.occupants[0]);
      }

      // Restore selected occupant from storage
      const savedOccupantId = localStorage.getItem('selectedOccupantId');
      if (savedOccupantId && userData.occupants) {
        const occupant = userData.occupants.find((o) => o.id === savedOccupantId);
        if (occupant) {
          setSelectedOccupant(occupant);
        }
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('selectedOccupantId');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);

    // Identify user for analytics
    identifyUser(userData.id, {
      email: userData.email,
      isAdmin: userData.isAdmin,
      roomNumber: userData.room?.roomNumber,
      unitName: userData.room?.unit?.name,
    });

    // Track login event
    trackEvent(EVENTS.USER_LOGGED_IN, {
      isAdmin: userData.isAdmin,
    });

    // Auto-select occupant if only one
    if (userData.occupants?.length === 1) {
      setSelectedOccupant(userData.occupants[0]);
      localStorage.setItem('selectedOccupantId', userData.occupants[0].id);
    }
  }, []);

  const logout = useCallback(() => {
    // Track logout event
    trackEvent(EVENTS.USER_LOGGED_OUT);

    localStorage.removeItem('token');
    localStorage.removeItem('selectedOccupantId');
    setUser(null);
    setSelectedOccupant(null);
  }, []);

  const selectOccupant = useCallback((occupant: Occupant) => {
    setSelectedOccupant(occupant);
    localStorage.setItem('selectedOccupantId', occupant.id);

    // Track occupant switch
    trackEvent(EVENTS.OCCUPANT_SWITCHED, {
      occupantId: occupant.id,
      occupantName: occupant.name,
      choreDay: occupant.choreDay,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        selectedOccupant,
        login,
        logout,
        selectOccupant,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
