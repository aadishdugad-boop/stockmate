import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Warehouse, Mail, Lock, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(email, password);
    if (success) {
      navigate({ to: '/dashboard' });
    } else {
      setError('Invalid credentials. Try admin@stockmate.com or staff@stockmate.com');
    }
  };

  const quickLogin = (role: 'admin' | 'staff') => {
    const emails = { admin: 'admin@stockmate.com', staff: 'staff@stockmate.com' };
    const success = login(emails[role], 'password');
    if (success) navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4 shadow-lg">
            <Warehouse className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">StockMate</h1>
          <p className="text-sm text-muted-foreground mt-1">Inventory Tracking System</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@stockmate.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Any password works"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
              Sign In
            </button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick Login</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => quickLogin('admin')} className="py-2.5 rounded-lg border border-border text-sm font-medium text-card-foreground hover:bg-secondary transition-colors">
                Admin
              </button>
              <button onClick={() => quickLogin('staff')} className="py-2.5 rounded-lg border border-border text-sm font-medium text-card-foreground hover:bg-secondary transition-colors">
                Staff
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">Demo: Use any password with the emails above</p>
      </motion.div>
    </div>
  );
}
