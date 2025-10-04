import { Button } from '@/components/ui/button';
import { usePDS } from '@/contexts/PDSContext';
import { Link } from '@tanstack/react-router';
import { UserCircle } from 'lucide-react';

export function Header() {
  const { session, logout } = usePDS();

  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <h1 className="text-2xl font-bold">Atrarium Dashboard</h1>

      <div className="flex items-center gap-4">
        {session.isAuthenticated && session.handle ? (
          <>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1.5">
              <UserCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{session.handle}</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </>
        ) : (
          <Link to="/">
            <Button variant="default" size="sm">
              Login
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
