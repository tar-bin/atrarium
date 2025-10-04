import { UserSession } from '@/types';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user: UserSession | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <h1 className="text-2xl font-bold">Atrarium Dashboard</h1>

      <div className="flex items-center gap-4">
        {user?.isAuthenticated && (
          <>
            <span className="text-sm font-medium">{user.handle}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
