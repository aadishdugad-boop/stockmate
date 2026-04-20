import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { useStock } from '@/contexts/StockContext';
import { useAuth } from '@/contexts/AuthContext';
import { getStockStatus, type SaleRecord, type PaymentStatus } from '@/lib/types';
import { exportStockToCSV, downloadCSV } from '@/lib/csv';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Package, TrendingUp, AlertTriangle, IndianRupee, Edit2, Trash2, X, AlertCircle, ChevronRight, ChevronDown, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
});

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

interface Bill {
  billId: string;
  customer: string;
  date: string;
  paymentStatus: PaymentStatus;
  total: number;
  paid: number;
  due: number;
  lines: SaleRecord[];
}

function groupBills(sales: SaleRecord[]): Bill[] {
  const map = new Map<string, Bill>();
  for (const s of sales) {
    const key = s.billId || s.id; // legacy safety
    const existing = map.get(key);
    if (existing) {
      existing.total += s.totalPrice;
      existing.paid += s.amountPaid;
      existing.due += s.amountDue;
      existing.lines.push(s);
      // keep earliest date
      if (s.date < existing.date) existing.date = s.date;
    } else {
      map.set(key, {
        billId: key,
        customer: s.customer,
        date: s.date,
        paymentStatus: s.paymentStatus,
        total: s.totalPrice,
        paid: s.amountPaid,
        due: s.amountDue,
        lines: [s],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function isBillOverdue(b: Bill) {
  if (b.due <= 0 || b.paymentStatus === 'paid') return false;
  const t = new Date(b.date).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= FIFTEEN_DAYS_MS;
}

function paymentBadge(status: PaymentStatus) {
  const map = {
    paid: 'bg-success/10 text-success border-success/30',
    partial: 'bg-warning/10 text-warning border-warning/30',
    unpaid: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${map[status]}`}>{status}</span>;
}

function ReportsPage() {
  const { stock, sales, updateBillPayment, deleteBill } = useStock();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState<Bill | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalValue = stock.reduce((s, i) => s + i.quantity * i.price, 0);
  const totalSalesValue = sales.reduce((s, r) => s + r.totalPrice, 0);
  const totalDue = sales.reduce((s, r) => s + (r.amountDue || 0), 0);
  const lowStockItems = stock.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out');
  const categories = [...new Set(stock.map(s => s.category))];

  const bills = useMemo(() => groupBills(sales), [sales]);
  const overdueCount = useMemo(() => bills.filter(isBillOverdue).length, [bills]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleExportInventory = () => {
    const csv = exportStockToCSV(stock);
    downloadCSV(csv, `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Inventory report exported');
  };

  const handleExportSales = () => {
    const rows = sales.map(s => ({
      'Bill ID': s.billId || s.id,
      Date: s.date,
      Customer: s.customer || 'N/A',
      Product: s.stockName,
      Quantity: s.quantity,
      'Unit Price (Rs)': s.unitPrice,
      'Line Total (Rs)': s.totalPrice,
      'Paid (Rs)': s.amountPaid,
      'Due (Rs)': s.amountDue,
      Status: s.paymentStatus,
    }));
    const csv = rows.length ? Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n') : '';
    downloadCSV(csv, `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Sales report exported');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Inventory, bills and payment reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center"><Package className="w-4 h-4 text-primary-foreground" /></div>
              <span className="text-sm text-muted-foreground">Products</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{stock.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center"><IndianRupee className="w-4 h-4 text-accent-foreground" /></div>
              <span className="text-sm text-muted-foreground">Inventory Value</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg gradient-warning flex items-center justify-center"><TrendingUp className="w-4 h-4 text-warning-foreground" /></div>
              <span className="text-sm text-muted-foreground">Total Sales</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">₹{totalSalesValue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{bills.length} bills</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg gradient-danger flex items-center justify-center"><AlertCircle className="w-4 h-4 text-destructive-foreground" /></div>
              <span className="text-sm text-muted-foreground">Outstanding Dues</span>
            </div>
            <p className="text-2xl font-bold text-destructive">₹{totalDue.toLocaleString('en-IN')}</p>
            {overdueCount > 0 && <p className="text-[10px] text-destructive/80 mt-0.5">{overdueCount} bills overdue &gt;15 days</p>}
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg gradient-danger flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-destructive-foreground" /></div>
              <span className="text-sm text-muted-foreground">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{lowStockItems.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center"><FileText className="w-5 h-5 text-primary-foreground" /></div>
              <div>
                <h3 className="font-semibold text-card-foreground">Inventory Report</h3>
                <p className="text-xs text-muted-foreground">Complete stock inventory with quantities and values</p>
              </div>
            </div>
            <button onClick={handleExportInventory} className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center"><TrendingUp className="w-5 h-5 text-accent-foreground" /></div>
              <div>
                <h3 className="font-semibold text-card-foreground">Sales Report</h3>
                <p className="text-xs text-muted-foreground">Bills with line items, customers and payments</p>
              </div>
            </div>
            <button onClick={handleExportSales} className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-card-foreground">Inventory Summary by Category</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Products</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Value (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Avg Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const items = stock.filter(s => s.category === cat);
                  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                  const catValue = items.reduce((s, i) => s + i.quantity * i.price, 0);
                  const avgPrice = items.reduce((s, i) => s + i.price, 0) / items.length;
                  return (
                    <tr key={cat} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-card-foreground">{cat}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{items.length}</td>
                      <td className="px-4 py-3 text-right font-mono text-card-foreground">{totalQty.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-card-foreground">₹{catValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">₹{avgPrice.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Bills (grouped) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-accent" /> Bills & Payments</h3>
            {!isAdmin && <p className="text-xs text-muted-foreground">Only admin can edit or delete bills</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="w-8 px-2"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bill</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Customer</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Items</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Paid (₹)</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Due (₹)</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  {isAdmin && <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {bills.map(b => {
                  const overdue = isBillOverdue(b);
                  const open = expanded.has(b.billId);
                  return (
                    <>
                      <tr key={b.billId} className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${overdue ? 'bg-destructive/5' : ''}`} onClick={() => toggle(b.billId)}>
                        <td className="px-2 text-muted-foreground">
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{b.date}</td>
                        <td className="px-4 py-3 font-mono text-xs text-card-foreground">{b.billId}</td>
                        <td className="px-4 py-3 text-card-foreground">{b.customer}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{b.lines.length}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-card-foreground">₹{b.total.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-mono text-success">₹{b.paid.toLocaleString('en-IN')}</td>
                        <td className={`px-4 py-3 text-right font-mono ${b.due > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>₹{b.due.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {paymentBadge(b.paymentStatus)}
                            {overdue && <span title="Overdue >15 days" className="text-destructive"><AlertCircle className="w-3.5 h-3.5" /></span>}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setEditing(b)} className="p-1.5 rounded-md hover:bg-info/10 text-info transition-colors" title="Edit payment"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => { if (confirm(`Delete entire bill ${b.billId} for ${b.customer}?`)) { deleteBill(b.billId); toast.success('Bill deleted'); } }} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors" title="Delete bill"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {open && (
                        <tr className="bg-muted/20 border-b border-border">
                          <td colSpan={isAdmin ? 10 : 9} className="px-4 py-3">
                            <div className="rounded-lg overflow-hidden border border-border bg-card">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/40 border-b border-border">
                                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Product</th>
                                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qty</th>
                                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Unit Price</th>
                                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.lines.map(l => (
                                    <tr key={l.id} className="border-b border-border last:border-0">
                                      <td className="px-3 py-2 text-card-foreground">{l.stockName}</td>
                                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{l.quantity}</td>
                                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">₹{l.unitPrice.toLocaleString('en-IN')}</td>
                                      <td className="px-3 py-2 text-right font-mono font-semibold text-card-foreground">₹{l.totalPrice.toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {b.lines[0]?.notes && <p className="text-xs text-muted-foreground mt-2">Notes: {b.lines[0].notes}</p>}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {bills.length === 0 && (
                  <tr><td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground">No bills recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {editing && isAdmin && (
          <EditBillPaymentModal
            bill={editing}
            onClose={() => setEditing(null)}
            onSave={(status, paid) => { updateBillPayment(editing.billId, status, paid); toast.success('Bill payment updated'); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

function EditBillPaymentModal({ bill, onClose, onSave }: { bill: Bill; onClose: () => void; onSave: (status: PaymentStatus, paid: number) => void }) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(bill.paymentStatus);
  const [amountPaid, setAmountPaid] = useState(bill.paid.toString());

  const paid = paymentStatus === 'paid' ? bill.total
    : paymentStatus === 'unpaid' ? 0
    : Math.min(Math.max(Number(amountPaid) || 0, 0), bill.total);
  const due = bill.total - paid;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl border border-border shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Update Bill Payment</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{bill.billId} · {bill.customer}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form
          onSubmit={e => { e.preventDefault();
            if (paymentStatus === 'partial' && (paid <= 0 || paid >= bill.total)) {
              toast.error('Partial amount must be between 0 and total bill');
              return;
            }
            onSave(paymentStatus, paid);
          }}
          className="space-y-4"
        >
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Bill Total</span><span className="font-bold text-card-foreground">₹{bill.total.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-success">Paid</span><span className="font-mono text-success">₹{paid.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-destructive">Due</span><span className="font-mono text-destructive">₹{due.toLocaleString('en-IN')}</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['paid', 'partial', 'unpaid'] as PaymentStatus[]).map(s => (
                <button key={s} type="button" onClick={() => setPaymentStatus(s)} className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                  paymentStatus === s
                    ? s === 'paid' ? 'bg-success/15 border-success text-success'
                      : s === 'partial' ? 'bg-warning/15 border-warning text-warning'
                      : 'bg-destructive/15 border-destructive text-destructive'
                    : 'border-input text-muted-foreground hover:bg-muted'
                }`}>{s}</button>
              ))}
            </div>
          </div>
          {paymentStatus === 'partial' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount Paid (₹)</label>
              <input required type="number" min="0" max={bill.total || undefined} step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors text-foreground">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Save Changes</button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
