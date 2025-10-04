import { Button } from '@/components/ui/button';
import { Link, useRouterState } from '@tanstack/react-router';
import { usePDS } from '@/contexts/PDSContext';
import { X } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onClose = () => {} }: SidebarProps) {
  const { session } = usePDS();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/communities', label: 'Communities' },
    { href: '/moderation', label: 'Moderation Log' },
  ];

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r bg-background p-4"
      role="navigation"
    >
      {/* Mobile close button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Navigation</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="md:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            aria-current={currentPath === item.href ? 'page' : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              currentPath === item.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className="mt-auto border-t pt-4">
        {session.isAuthenticated && session.handle ? (
          <div className="text-sm">
            <p className="font-medium">{session.handle}</p>
            <p className="truncate text-xs text-muted-foreground">{session.did}</p>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Please login to continue
          </div>
        )}
      </div>
    </aside>
  );
}
