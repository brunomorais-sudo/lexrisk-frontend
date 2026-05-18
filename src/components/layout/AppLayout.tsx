import { AppSidebar } from './AppSidebar';
import { NotificationsBell } from './NotificationsBell';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b bg-background/80 px-6 backdrop-blur lg:px-8">
          <NotificationsBell />
        </header>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
