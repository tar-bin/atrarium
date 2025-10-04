import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-[auto_1fr]">
      <Sidebar currentPath={window.location.pathname} isOpen={true} onClose={() => {}} />
      <div className="flex flex-col">
        <Header user={null} onLogout={() => {}} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
