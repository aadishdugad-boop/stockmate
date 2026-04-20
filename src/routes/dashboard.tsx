import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { useStock } from '@/contexts/StockContext';
import { useAuth } from '@/contexts/AuthContext';
import { getStockStatus } from '@/lib/types';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import {
  Package, AlertTriangle, TrendingUp, Activity, ArrowUpCircle, ArrowDownCircle,
  IndianRupee, ShoppingCart, Layers, Clock, ChevronRight, Zap, Bell
} from 'lucide-react';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { stock, movements, sales } = useStock();
  const { isAdmin, user } = useAuth();

  const totalStock = stock.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = stock.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out').length;
  const totalSales = sales.reduce((s, r) => s + r.totalPrice, 0);
  const totalValue = stock.reduce((s, i) => s + i.quantity * i.price, 0);
  const recentMovements = movements.slice(0, 6);
  const categories = [...new Set(stock.map(s => s.category))];
  const outOfStockCount = stock.filter(i => getStockStatus(i) === 'out').length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's happening with your inventory today
            </p>
          </div>
          <Link
            to="/notifications"
            className="relative p-2.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Stock Units"
            value={totalStock.toLocaleString('en-IN')}
            icon={<Package className="w-5 h-5 text-primary-foreground" />}
            gradient="gradient-primary"
            change={`${stock.length} products tracked`}
            changeType="neutral"
          />
          <StatCard
            title="Inventory Value"
            value={`₹${totalValue.toLocaleString('en-IN')}`}
            icon={<IndianRupee className="w-5 h-5 text-primary-foreground" />}
            gradient="gradient-accent"
            change={`Across ${categories.length} categories`}
            changeType="positive"
          />
          {isAdmin && (
            <StatCard
              title="Total Revenue"
              value={`₹${totalSales.toLocaleString('en-IN')}`}
              icon={<TrendingUp className="w-5 h-5 text-primary-foreground" />}
              gradient="gradient-warning"
              change={`${sales.length} transactions`}
              changeType="positive"
            />
          )}
          <StatCard
            title="Alerts"
            value={lowStockCount}
            icon={<AlertTriangle className="w-5 h-5 text-primary-foreground" />}
            gradient="gradient-danger"
            change={outOfStockCount > 0 ? `${outOfStockCount} out of stock!` : 'All healthy'}
            changeType={lowStockCount > 0 ? 'negative' : 'positive'}
          />
        </div>

        {/* Quick Actions + Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" /> Quick Actions
            </h3>
            <div className="space-y-2">
              <Link to="/stock" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">Manage Stock</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
              {isAdmin && (
                <Link to="/reports" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <span className="text-sm font-medium text-card-foreground">View Reports</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
              <Link to="/notifications" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-danger flex items-center justify-center">
                    <Bell className="w-4 h-4 text-destructive-foreground" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">Notifications ({lowStockCount})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
              {isAdmin && (
                <Link to="/visualization" className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-warning flex items-center justify-center">
                      <Layers className="w-4 h-4 text-warning-foreground" />
                    </div>
                    <span className="text-sm font-medium text-card-foreground">Analytics</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm lg:col-span-2"
          >
            <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Category Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat, i) => {
                const items = stock.filter(s => s.category === cat);
                const catQty = items.reduce((s, it) => s + it.quantity, 0);
                const catValue = items.reduce((s, it) => s + it.quantity * it.price, 0);
                const catLow = items.filter(it => getStockStatus(it) !== 'in-stock').length;
                const gradients = ['gradient-primary', 'gradient-accent', 'gradient-warning', 'gradient-danger'];
                return (
                  <div key={cat} className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${gradients[i % gradients.length]}`} />
                      <span className="text-sm font-semibold text-card-foreground">{cat}</span>
                      {catLow > 0 && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          {catLow} alert{catLow > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{items.length} products</p>
                        <p className="text-lg font-bold font-mono text-card-foreground">{catQty.toLocaleString('en-IN')} units</p>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">₹{catValue.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Low Stock + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products by Value */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Top Products by Value
            </h3>
            <div className="space-y-3">
              {stock
                .map(i => ({ ...i, totalValue: i.quantity * i.price }))
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, 5)
                .map((item, idx) => {
                  const maxVal = stock.reduce((mx, i) => Math.max(mx, i.quantity * i.price), 1);
                  const pct = (item.totalValue / maxVal) * 100;
                  return (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                          <span className="text-sm font-medium text-card-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-mono font-semibold text-card-foreground">₹{item.totalValue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.5 + idx * 0.1, duration: 0.6 }}
                          className="h-full rounded-full gradient-primary"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-info" /> Recent Activity
            </h3>
            <div className="space-y-3">
              {recentMovements.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === 'in' ? 'bg-success/10' : 'bg-warning/10'}`}>
                    {m.type === 'in' ? <ArrowUpCircle className="w-4 h-4 text-success" /> : <ArrowDownCircle className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{m.stockName}</p>
                    <p className="text-xs text-muted-foreground">{m.performedBy} · {m.date}</p>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${m.type === 'in' ? 'text-success' : 'text-warning'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
              {recentMovements.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
