import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  gradient: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({ title, value, icon, gradient, change, changeType = 'neutral' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              changeType === 'positive' ? 'text-success' : changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${gradient}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
