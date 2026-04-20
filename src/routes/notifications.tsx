import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { useStock } from '@/contexts/StockContext';
import { getStockStatus } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle, Bell, ArrowUpCircle, ArrowDownCircle, Clock, X, Eye, IndianRupee } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

const DISMISSED_KEY = 'stockmate_dismissed_notifs';

function getDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

type TabType = 'all' | 'alerts' | 'activity';

function NotificationsPage() {
  const { stock, movements, sales } = useStock();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      allNotifs.forEach(n => next.add(n.id));
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const outOfStock = stock.filter(i => getStockStatus(i) === 'out');
  const lowStock = stock.filter(i => getStockStatus(i) === 'low');
  const healthyCount = stock.filter(i => getStockStatus(i) === 'in-stock').length;

  // Group sales by bill, then flag overdue (>15d) bills with outstanding due
  const now = Date.now();
  const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
  const billMap = new Map<string, { billId: string; customer: string; date: string; total: number; due: number; status: string }>();
  for (const s of sales) {
    const key = s.billId || s.id;
    const ex = billMap.get(key);
    if (ex) {
      ex.total += s.totalPrice;
      ex.due += s.amountDue;
      if (s.date < ex.date) ex.date = s.date;
    } else {
      billMap.set(key, { billId: key, customer: s.customer, date: s.date, total: s.totalPrice, due: s.amountDue, status: s.paymentStatus });
    }
  }
  const overdueBills = Array.from(billMap.values()).filter(b => {
    if (b.due <= 0) return false;
    const t = new Date(b.date).getTime();
    if (Number.isNaN(t)) return false;
    return now - t >= FIFTEEN_DAYS;
  });

  const alerts = [
    ...overdueBills.map(b => {
      const days = Math.floor((now - new Date(b.date).getTime()) / (24 * 60 * 60 * 1000));
      return {
        id: `bill-${b.billId}`,
        type: 'critical' as const,
        title: `Bill overdue: ${b.customer}`,
        description: `${b.billId} · ${b.status === 'unpaid' ? 'Unpaid' : 'Partially paid'} · Due Rs.${b.due.toLocaleString('en-IN')} of Rs.${b.total.toLocaleString('en-IN')} · ${days} days old`,
        icon: IndianRupee,
        time: b.date,
      };
    }),
    ...outOfStock.map(item => ({
      id: `out-${item.id}`,
      type: 'critical' as const,
      title: `${item.name} is OUT OF STOCK`,
      description: `Category: ${item.category} · Last updated: ${item.lastUpdated}`,
      icon: AlertCircle,
      time: item.lastUpdated,
    })),
    ...lowStock.map(item => ({
      id: `low-${item.id}`,
      type: 'warning' as const,
      title: `${item.name} is running low`,
      description: `Only ${item.quantity} ${item.unit} left (min: ${item.minQuantity} ${item.unit}) · Rs.${item.price.toLocaleString('en-IN')}/${item.unit}`,
      icon: AlertTriangle,
      time: item.lastUpdated,
    })),
  ];

  const activityNotifs = movements.slice(0, 15).map(m => ({
    id: `mov-${m.id}`,
    type: 'info' as const,
    title: `${m.type === 'in' ? 'Stock In' : 'Stock Out'}: ${m.stockName}`,
    description: `${m.quantity} units ${m.type === 'in' ? 'added' : 'removed'} by ${m.performedBy}${m.notes ? ` — ${m.notes}` : ''}`,
    icon: m.type === 'in' ? ArrowUpCircle : ArrowDownCircle,
    time: m.date,
  }));

  const allNotifs = [...alerts, ...activityNotifs].sort((a, b) => b.time.localeCompare(a.time));
  const activeNotifs = allNotifs.filter(n => !dismissedIds.has(n.id));
  const activeAlerts = alerts.filter(n => !dismissedIds.has(n.id));
  const activeActivity = activityNotifs.filter(n => !dismissedIds.has(n.id));
  
  const displayNotifs = activeTab === 'all' ? activeNotifs : activeTab === 'alerts' ? activeAlerts : activeActivity;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: activeNotifs.length },
    { key: 'alerts', label: 'Alerts', count: activeAlerts.length },
    { key: 'activity', label: 'Activity', count: activeActivity.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6" /> Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Stock alerts and activity updates</p>
          </div>
          {activeNotifs.length > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> Mark all as read
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 rounded-xl border border-destructive/20 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{outOfStock.length}</p>
                <p className="text-xs text-destructive/80 font-medium">Out of Stock</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-warning/10 rounded-xl border border-warning/20 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
                <p className="text-xs text-warning/80 font-medium">Low Stock</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-success/10 rounded-xl border border-success/20 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{healthyCount}</p>
                <p className="text-xs text-success/80 font-medium">Healthy Stock</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-card-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayNotifs.map((notif, idx) => {
              const Icon = notif.icon;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`bg-card rounded-xl border p-4 shadow-sm flex items-start gap-4 group ${
                    notif.type === 'critical'
                      ? 'border-destructive/30 bg-destructive/5'
                      : notif.type === 'warning'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    notif.type === 'critical'
                      ? 'bg-destructive/10'
                      : notif.type === 'warning'
                      ? 'bg-warning/10'
                      : 'bg-primary/10'
                  }`}>
                    <Icon className={`w-4.5 h-4.5 ${
                      notif.type === 'critical' ? 'text-destructive' : notif.type === 'warning' ? 'text-warning' : 'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{notif.time}</span>
                    </div>
                    <button
                      onClick={() => dismiss(notif.id)}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {displayNotifs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
              <p className="font-medium">All clear!</p>
              <p className="text-sm">No notifications to show</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
