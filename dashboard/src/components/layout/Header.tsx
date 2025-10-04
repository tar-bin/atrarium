import { Button } from '@/components/ui/button';
import { usePDS } from '@/contexts/PDSContext';

export function Header() {
  const { session, logout } = usePDS();

  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <h1 className="text-2xl font-bold">Atrarium Dashboard</h1>

      <div className="flex items-center gap-4">
        {session.isAuthenticated && (
          <>
            <span className="text-sm font-medium">{session.handle}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
