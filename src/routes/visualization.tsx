import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { useStock } from '@/contexts/StockContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  Search, Package, AlertTriangle, TrendingUp, Download, Filter,
  Layers, IndianRupee, ArrowRight, Sparkles, ShieldAlert,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  buildCategorySummaries,
  brandSalesForCategory,
  categorySalesTotals,
  restockPriority,
  inr,
} from '@/lib/analyticsHelpers';

export const Route = createFileRoute('/visualization')({
  component: VisualizationPage,
});

const PALETTE = [
  'oklch(0.55 0.15 175)', // teal
  'oklch(0.65 0.17 35)',  // coral
  'oklch(0.70 0.16 75)',  // amber
  'oklch(0.55 0.15 280)', // indigo
  'oklch(0.60 0.16 145)', // emerald
  'oklch(0.60 0.18 320)', // magenta
  'oklch(0.55 0.14 220)', // sky
];

function VisualizationPage() {
  const { stock, sales } = useStock();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');

  const filteredSales = useMemo(() => {
    if (dateRange === 'all') return sales;
    const days = dateRange === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    return sales.filter(s => new Date(s.date).getTime() >= cutoff);
  }, [sales, dateRange]);

  const categories = useMemo(() => buildCategorySummaries(stock), [stock]);

  const visibleCategories = useMemo(
    () => categories.filter(c => c.category.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const activeCategory = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find(c => c.category === selectedCategory) ?? null;
  }, [categories, selectedCategory]);

  const brandSales = useMemo(
    () => (activeCategory ? brandSalesForCategory(activeCategory.category, stock, filteredSales) : []),
    [activeCategory, stock, filteredSales]
  );

  const overallSales = useMemo(() => categorySalesTotals(stock, filteredSales), [stock, filteredSales]);
  const restockList = useMemo(() => restockPriority(stock), [stock]);

  const totals = useMemo(() => {
    const totalValue = stock.reduce((s, i) => s + i.quantity * i.price, 0);
    const totalUnits = stock.reduce((s, i) => s + i.quantity, 0);
    const totalRevenue = filteredSales.reduce((s, x) => s + x.totalPrice, 0);
    const skuCount = stock.length;
    return { totalValue, totalUnits, totalRevenue, skuCount };
  }, [stock, filteredSales]);

  const exportCsv = () => {
    const rows = [
      ['Category', 'Brand', 'Quantity', 'Unit', 'Price', 'StockValue', 'UnitsSold', 'Revenue'],
    ];
    for (const cat of categories) {
      const bs = brandSalesForCategory(cat.category, stock, filteredSales);
      for (const b of cat.brands) {
        const sale = bs.find(x => x.stockId === b.id);
        rows.push([
          cat.category, b.name, String(b.quantity), b.unit, String(b.price),
          String(b.value), String(sale?.unitsSold ?? 0), String(sale?.revenue ?? 0),
        ]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stockmate-analytics-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Analytics Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live drilldowns across categories, brands, sales & restock priority
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
              {(['all', '30d', '7d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    dateRange === r ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'All time' : r === '30d' ? 'Last 30d' : 'Last 7d'}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-secondary transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<Layers className="w-4 h-4" />} label="Categories" value={categories.length.toString()} accent="oklch(0.55 0.15 175)" />
          <KpiCard icon={<Package className="w-4 h-4" />} label="SKUs" value={totals.skuCount.toString()} accent="oklch(0.55 0.15 280)" />
          <KpiCard icon={<IndianRupee className="w-4 h-4" />} label="Inventory Value" value={inr(totals.totalValue)} accent="oklch(0.60 0.16 145)" />
          <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Revenue" value={inr(totals.totalRevenue)} accent="oklch(0.65 0.17 35)" />
        </div>

        {/* Category drilldown */}
        <section className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Category → Brand Drilldown
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click a category to inspect its brands</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search category…"
                className="pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 w-56"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {visibleCategories.map((c, i) => {
              const active = c.category === selectedCategory;
              return (
                <motion.button
                  key={c.category}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedCategory(active ? null : c.category)}
                  className={`group relative px-4 py-3 rounded-xl border transition-all text-left min-w-[160px] ${
                    active
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-sm font-semibold text-card-foreground">{c.category}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-lg font-bold font-mono text-card-foreground">{c.totalQuantity}</span>
                    <span className="text-[10px] text-muted-foreground">units · {c.brandCount} brands</span>
                  </div>
                  {(c.lowCount + c.outCount) > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                      {c.lowCount + c.outCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
            {visibleCategories.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No categories match your search.</p>
            )}
          </div>

          {/* Drilldown content */}
          <AnimatePresence mode="wait">
            {activeCategory ? (
              <motion.div
                key={activeCategory.category}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-5"
              >
                {/* Brand stock chart */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-card-foreground">Stock by Brand</h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> {activeCategory.brands.length} brands
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(220, activeCategory.brands.length * 38)}>
                    <BarChart data={activeCategory.brands} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 170)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.01 170)', fontSize: 12 }}
                        formatter={(v: number, _n, p: any) => [`${v} ${p.payload.unit}`, 'Stock']}
                      />
                      <Bar dataKey="quantity" radius={[0, 8, 8, 0]}>
                        {activeCategory.brands.map((b, i) => (
                          <Cell key={b.id} fill={
                            b.status === 'out' ? 'oklch(0.55 0.22 25)'
                              : b.status === 'low' ? 'oklch(0.73 0.17 70)'
                              : PALETTE[i % PALETTE.length]
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Brand sales — units only, no ranking */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-card-foreground">Sales by Brand</h3>
                    <span className="text-xs text-muted-foreground">
                      {brandSales.reduce((s, b) => s + b.unitsSold, 0)} total units
                    </span>
                  </div>
                  {brandSales.length === 0 || brandSales.every(b => b.unitsSold === 0) ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No sales recorded for this category yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(220, brandSales.length * 38)}>
                      <BarChart data={brandSales} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 170)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.01 170)', fontSize: 12 }}
                          formatter={(v: number, _n, p: any) => [`${v} units · ${inr(p.payload.revenue)}`, p.payload.name]}
                        />
                        <Bar dataKey="unitsSold" radius={[0, 8, 8, 0]}>
                          {brandSales.map((b, i) => (
                            <Cell key={b.stockId} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground text-center py-10"
              >
                Pick a category above to drill into brand-level stock & sales.
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        {/* Lower row: overall sales + inventory value */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-card-foreground mb-1">Overall Category Sales</h3>
            <p className="text-xs text-muted-foreground mb-4">Total units sold across all categories</p>
            {overallSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No sales in selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={overallSales} dataKey="units" nameKey="category"
                    cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={3}
                    label={({ category, units }) => `${category}: ${units}`}
                    onClick={(d: any) => setSelectedCategory(d?.category ?? null)}
                  >
                    {overallSales.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.01 170)', fontSize: 12 }}
                    formatter={(v: number, _n, p: any) => [`${v} units · ${inr(p.payload.revenue)}`, p.payload.category]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-card-foreground mb-1">Inventory Value by Category</h3>
            <p className="text-xs text-muted-foreground mb-4">Where your money is locked in stock</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categories.map(c => ({ category: c.category, value: c.totalValue }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 170)" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.50 0.03 170)" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid oklch(0.92 0.01 170)', fontSize: 12 }}
                  formatter={(v: number) => [inr(v), 'Stock value']}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} onClick={(d: any) => setSelectedCategory(d?.category ?? null)}>
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} className="cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Restock priority */}
        <section className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                Restock Priority
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-ranked by urgency · updates with stock changes</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">
              {restockList.length} item{restockList.length !== 1 ? 's' : ''} need attention
            </span>
          </div>
          {restockList.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-card-foreground">All stock is healthy</p>
              <p className="text-xs text-muted-foreground mt-1">No restock needed right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {restockList.map(({ item, status, score }, idx) => {
                const sev = status === 'out' ? 'destructive' : 'warning';
                const cap = Math.max(item.minQuantity * 5, item.quantity);
                const pct = (item.quantity / cap) * 100;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-4 rounded-xl border ${
                      status === 'out' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-card-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sev === 'destructive' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                      }`}>
                        {status === 'out' ? 'OUT' : 'LOW'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>{item.quantity} {item.unit} left</span>
                      <span>min {item.minQuantity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: status === 'out' ? 'oklch(0.55 0.22 25)' : 'oklch(0.73 0.17 70)',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      Priority score: <span className="font-bold text-card-foreground">{score}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4 shadow-sm relative overflow-hidden"
    >
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent} / 12%`, color: accent }}>
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono text-card-foreground">{value}</p>
    </motion.div>
  );
}
