import { UserSession } from '@/types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  user?: Pick<UserSession, 'handle' | 'did' | 'isAuthenticated'> | null;
}

export function Sidebar({ currentPath, isOpen, onClose, user }: SidebarProps) {
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/communities', label: 'Communities' },
    { href: '/moderation-log', label: 'Moderation Log' },
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
          <a
            key={item.href}
            href={item.href}
            aria-current={currentPath === item.href ? 'page' : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              currentPath === item.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* User Info */}
      {user?.isAuthenticated && user.handle && (
        <div className="mt-auto border-t pt-4">
          <div className="text-sm">
            <p className="font-medium">{user.handle}</p>
            <p className="truncate text-xs text-muted-foreground">{user.did}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
