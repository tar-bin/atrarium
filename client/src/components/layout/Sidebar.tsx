import { Button } from '@/components/ui/button';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { usePDS } from '@/contexts/PDSContext';
import { useLayoutContext } from '@/contexts/LayoutContext';
import { X, UserCircle, LogOut, LogIn } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onClose = () => {} }: SidebarProps) {
  const { session, logout } = usePDS();
  const { contextInfo } = useLayoutContext();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();

  const navItems = [
    { href: '/communities', label: 'Communities' },
    { href: '/moderation', label: 'Moderation Log' },
  ];

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r bg-slate-50 p-4"
      role="navigation"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Atrarium</h2>
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
      <nav className="space-y-2">
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

      {/* Context Info (Community & Feed) */}
      {contextInfo && (contextInfo.communityName || contextInfo.feedName) && (
        <div className="mt-4 rounded-md bg-white/50 p-3 border border-slate-200">
          <div className="space-y-1 text-xs">
            {contextInfo.communityName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-medium">Community:</span>
                <Link
                  to="/communities/$communityId"
                  params={{ communityId: contextInfo.communityId || '' }}
                  className="hover:text-foreground truncate"
                >
                  {contextInfo.communityName}
                </Link>
              </div>
            )}
            {contextInfo.feedName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-medium">Feed:</span>
                <span className="truncate text-foreground">{contextInfo.feedName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* User Info & Actions */}
      <div className="mt-auto space-y-3 border-t pt-4">
        {session.isAuthenticated && session.handle ? (
          <>
            <div className="flex items-center gap-3 rounded-md bg-muted p-3">
              <UserCircle className="h-8 w-8 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.handle}</p>
                <p className="truncate text-xs text-muted-foreground">{session.did}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate({ to: '/' })}
            className="w-full"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </aside>
  );
}
