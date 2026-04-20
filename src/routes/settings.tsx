import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { User, Shield, Sun, Moon, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleClearData = () => {
    if (confirm('Are you sure? This will reset all stock data to defaults.')) {
      localStorage.removeItem('stockmate_stock');
      localStorage.removeItem('stockmate_movements');
      localStorage.removeItem('stockmate_sales');
      toast.success('Data reset to defaults. Refresh the page.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences</p>
        </div>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Profile</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                {user?.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-card-foreground">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm capitalize font-medium text-card-foreground">{user?.role}</span>
              <span className="text-xs text-muted-foreground">
                — {isAdmin ? 'Full access to all features' : 'Limited access (view & stock operations)'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2"><Database className="w-4 h-4" /> Data Management</h3>
          <p className="text-sm text-muted-foreground mb-4">All data is stored locally in your browser. Resetting will restore default demo data.</p>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Reset All Data
          </button>
        </motion.div>

        {/* User management placeholder (admin only) */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> User Management</h3>
            <div className="space-y-3">
              {[
                { name: 'Admin User', email: 'admin@stockmate.com', role: 'Admin' },
                { name: 'Staff Member', email: 'staff@stockmate.com', role: 'Staff' },
              ].map(u => (
                <div key={u.email} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{u.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">{u.role}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
