import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Toaster } from '@/components/ui/sonner';

// Layouts
import DashboardLayout from '@/components/layout/DashboardLayout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Agenda from '@/pages/Agenda';
import POS from '@/pages/POS';
import Customers from '@/pages/Customers';
import Services from '@/pages/Services';
import Finance from '@/pages/Finance';
import Settings from '@/pages/Settings';
import PublicBooking from '@/pages/PublicBooking';
import Marketing from '@/pages/Marketing';

// Placeholder Pages for MVP
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 flex flex-col items-center justify-center h-[50vh] text-muted-foreground border-2 border-dashed rounded-lg">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p>Em desenvolvimento...</p>
  </div>
);

function App() {
  const { user, initialize, isLoading } = useStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-primary">Carregando BarberOS...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/book/:slug" element={<PublicBooking />} />
        
        {/* Auth Routes */}
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="pos" element={<POS />} />
            <Route path="customers" element={<Customers />} />
            <Route path="services" element={<Services />} />
            <Route path="finance" element={<Finance />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="settings" element={<Settings />} />
            <Route path="reports" element={<Placeholder title="Relatórios" />} />
          </Route>
        )}
      </Routes>
      <Toaster theme="dark" />
    </BrowserRouter>
  );
}

export default App;
