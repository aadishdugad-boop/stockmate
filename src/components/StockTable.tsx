import { useState, useRef, useMemo } from 'react';
import { useStock, type BillLineInput } from '@/contexts/StockContext';
import { useAuth } from '@/contexts/AuthContext';
import type { StockItem, PaymentStatus } from '@/lib/types';
import { getStockStatus, UNIT_OPTIONS } from '@/lib/types';
import { exportStockToCSV, downloadCSV, parseCSVFile } from '@/lib/csv';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Upload, Download, Edit2, Trash2, ArrowUpCircle,
  ArrowDownCircle, X, Package, ChevronDown, IndianRupee, User as UserIcon, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

export function StockTable() {
  const { stock, addStock, updateStock, deleteStock, stockIn, createBill, importStock } = useStock();
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'stockIn' | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billPrefillStockId, setBillPrefillStockId] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const perPage = 8;

  const categories = [...new Set(stock.map(s => s.category))];

  const filtered = stock.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || getStockStatus(item) === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleExport = () => {
    const csv = exportStockToCSV(stock);
    downloadCSV(csv, `stockmate_export_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exported successfully');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseCSVFile(file);
      importStock(items);
      toast.success(`Imported ${items.length} items`);
    } catch {
      toast.error('Failed to parse CSV');
    }
    e.target.value = '';
  };

  const openBillModal = (prefillStockId?: string) => {
    setBillPrefillStockId(prefillStockId);
    setShowBillModal(true);
  };

  const statusBadge = (item: StockItem) => {
    const status = getStockStatus(item);
    const styles = {
      'in-stock': 'bg-success/10 text-success',
      'low': 'bg-warning/10 text-warning',
      'out': 'bg-destructive/10 text-destructive',
    };
    const labels = { 'in-stock': 'In Stock', 'low': 'Low Stock', 'out': 'Out of Stock' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-[220px]"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-card text-card-foreground hover:bg-secondary transition-colors">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-card text-card-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => openBillModal()} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg gradient-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity shadow-sm">
            <ShoppingCart className="w-4 h-4" /> New Bill
          </button>
          {isAdmin && (
            <button onClick={() => { setSelectedItem(null); setShowModal('add'); }} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-sm">
              <Plus className="w-4 h-4" /> Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Weight</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Price</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-card-foreground">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-card-foreground">{item.weight} kg</td>
                  <td className="px-4 py-3 text-right font-mono text-card-foreground">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelectedItem(item); setShowModal('stockIn'); }} className="p-1.5 rounded-md hover:bg-success/10 text-success transition-colors" title="Stock In">
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => openBillModal(item.id)} className="p-1.5 rounded-md hover:bg-warning/10 text-warning transition-colors" title="Sell / Stock Out">
                        <ArrowDownCircle className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => { setSelectedItem(item); setShowModal('edit'); }} className="p-1.5 rounded-md hover:bg-info/10 text-info transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { deleteStock(item.id); toast.success('Item deleted'); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">Showing {(page-1)*perPage+1}–{Math.min(page*perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i+1)} className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${page === i+1 ? 'gradient-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground'}`}>{i+1}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <StockModal
            type={showModal}
            item={selectedItem}
            onClose={() => setShowModal(null)}
            onAddStock={addStock}
            onUpdateStock={updateStock}
            onStockIn={(id, qty, notes) => { stockIn(id, qty, user?.name || 'Unknown', notes); }}
          />
        )}
        {showBillModal && (
          <BillModal
            prefillStockId={billPrefillStockId}
            onClose={() => setShowBillModal(false)}
            onCreate={(payload) => createBill(user?.name || 'Unknown', payload)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface StockModalProps {
  type: 'add' | 'edit' | 'stockIn';
  item: StockItem | null;
  onClose: () => void;
  onAddStock: (item: Omit<StockItem, 'id' | 'lastUpdated' | 'createdAt'>) => void;
  onUpdateStock: (id: string, updates: Partial<StockItem>) => void;
  onStockIn: (id: string, qty: number, notes?: string) => void;
}

function StockModal({ type, item, onClose, onAddStock, onUpdateStock, onStockIn }: StockModalProps) {
  const { stock } = useStock();
  const DEFAULT_CATS = ['Wheat', 'Rice', 'Dal', 'Oil'];
  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [categoryMode, setCategoryMode] = useState<'select' | 'new'>('select');
  const [newCategory, setNewCategory] = useState('');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '');
  const [weight, setWeight] = useState(item?.weight?.toString() || '');
  // USP = Unit Source Price (cost per kg or per litre)
  const [usp, setUsp] = useState(
    item && item.weight > 0 ? (item.price / item.weight).toFixed(2) : ''
  );
  const [unit, setUnit] = useState(item?.unit || 'Box');
  const [minQty, setMinQty] = useState(item?.minQuantity?.toString() || '10');
  const [moveQty, setMoveQty] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Liquid categories use litres; everything else uses kg
  const isLiquid = /oil|ghee|milk/i.test(category) || /oil|ghee|milk/i.test(newCategory);
  const weightUnit = isLiquid ? 'L' : 'kg';
  const weightNum = Number(weight) || 0;
  const uspNum = Number(usp) || 0;
  const pricePerBag = weightNum * uspNum;
  const qtyNum = Number(quantity) || 0;
  const totalStockValue = pricePerBag * qtyNum;

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATS);
    stock.forEach(s => s.category && set.add(s.category));
    return Array.from(set).sort();
  }, [stock]);

  const suggestions = useMemo(() => {
    if (!name.trim() || type !== 'add') return [];
    return stock.filter(s => s.name.toLowerCase().includes(name.toLowerCase())).slice(0, 5);
  }, [name, stock, type]);

  const fillFromExisting = (s: StockItem) => {
    setName(s.name);
    setCategory(s.category);
    setCategoryMode('select');
    setWeight(s.weight.toString());
    setUsp(s.weight > 0 ? (s.price / s.weight).toFixed(2) : '');
    setUnit(s.unit);
    setMinQty(s.minQuantity.toString());
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (categoryMode === 'new' ? newCategory.trim() : category).trim();
    if ((type === 'add' || type === 'edit') && !finalCategory) {
      toast.error('Please select or add a category');
      return;
    }
    if (type === 'add') {
      onAddStock({ name, category: finalCategory, quantity: Number(quantity), weight: Number(weight), price: pricePerBag, unit, minQuantity: Number(minQty) });
      toast.success('Stock item added');
    } else if (type === 'edit' && item) {
      onUpdateStock(item.id, { name, category: finalCategory, quantity: Number(quantity), weight: Number(weight), price: pricePerBag, unit, minQuantity: Number(minQty) });
      toast.success('Stock item updated');
    } else if (type === 'stockIn' && item) {
      onStockIn(item.id, Number(moveQty), notes);
      toast.success(`Added ${moveQty} ${item.unit} to ${item.name}`);
    }
    onClose();
  };

  const titles = { add: 'Add New Stock', edit: 'Edit Stock', stockIn: 'Stock In' };

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
          <h2 className="text-lg font-bold text-card-foreground">{titles[type]}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(type === 'add' || type === 'edit') && (
            <>
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand / Product Name</label>
                <input
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. Aashirvaad Atta, India Gate Basmati..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showSuggestions && suggestions.length > 0 && type === 'add' && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Existing Brands</p>
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => fillFromExisting(s)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-3 border-t border-border/50"
                      >
                        <Package className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">{s.category} · {s.weight}kg · {s.unit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  {categoryMode === 'select' ? (
                    <div className="relative">
                      <select
                        required
                        value={category}
                        onChange={e => {
                          if (e.target.value === '__new__') { setCategoryMode('new'); setCategory(''); }
                          else setCategory(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-8"
                      >
                        <option value="" disabled>Select category</option>
                        {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__new__">+ Add new category</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input required autoFocus value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category name" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button type="button" onClick={() => { setCategoryMode('select'); setNewCategory(''); }} className="px-2 rounded-lg border border-input text-muted-foreground hover:bg-muted transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Packaging Type</label>
                  <div className="relative">
                    <select required value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-8">
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity ({unit})</label>
                  <input required type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 500" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Weight per 1 {unit.toLowerCase()} ({weightUnit})
                  </label>
                  <input required type="number" min="0" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} placeholder={isLiquid ? 'e.g. 15' : 'e.g. 25'} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">USP (₹/{weightUnit})</label>
                  <input required type="number" min="0" step="0.01" value={usp} onChange={e => setUsp(e.target.value)} placeholder="cost per unit" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              {(weightNum > 0 && uspNum > 0) && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price per 1 {unit.toLowerCase()}</span>
                    <span className="font-mono font-semibold text-card-foreground">
                      ₹{pricePerBag.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {weightNum} {weightUnit} × ₹{uspNum}/{weightUnit}
                  </div>
                  {qtyNum > 0 && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-border">
                      <span className="text-muted-foreground">Total stock value ({qtyNum} {unit.toLowerCase()})</span>
                      <span className="font-mono font-bold text-primary">
                        ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Qty Alert</label>
                <input required type="number" min="0" value={minQty} onChange={e => setMinQty(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}
          {type === 'stockIn' && item && (
            <>
              <p className="text-sm text-muted-foreground">
                Adding to: <span className="font-semibold text-card-foreground">{item.name}</span>
                <br />Current: <span className="font-mono">{item.quantity} {item.unit}</span> · {item.weight}kg each
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                <input required type="number" min="1" value={moveQty} onChange={e => setMoveQty(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors text-foreground">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              {type === 'add' ? 'Add Item' : type === 'edit' ? 'Save Changes' : 'Stock In'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ============================================================
// Multi-item Bill modal — one customer can buy multiple items
// ============================================================

interface BillLineDraft {
  key: string;
  stockId: string;
  quantity: string;
  unitPrice: string;
}

interface BillModalProps {
  prefillStockId?: string;
  onClose: () => void;
  onCreate: (payload: {
    customer: string;
    items: BillLineInput[];
    paymentStatus: PaymentStatus;
    amountPaid: number;
    notes?: string;
  }) => string | null;
}

function BillModal({ prefillStockId, onClose, onCreate }: BillModalProps) {
  const { stock, sales } = useStock();

  const newLine = (stockId = ''): BillLineDraft => {
    const s = stock.find(x => x.id === stockId);
    return {
      key: Math.random().toString(36).slice(2),
      stockId,
      quantity: '',
      unitPrice: s ? s.price.toString() : '',
    };
  };

  const [customer, setCustomer] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [lines, setLines] = useState<BillLineDraft[]>(() => [newLine(prefillStockId)]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const billTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const paidNum = paymentStatus === 'paid' ? billTotal
    : paymentStatus === 'unpaid' ? 0
    : Math.min(Math.max(Number(amountPaid) || 0, 0), billTotal);
  const dueNum = billTotal - paidNum;

  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => s.customer && set.add(s.customer));
    return Array.from(set).sort();
  }, [sales]);
  const customerSuggestions = useMemo(() => {
    const q = customer.trim().toLowerCase();
    if (!q) return customerOptions.slice(0, 6);
    return customerOptions.filter(c => c.toLowerCase().includes(q)).slice(0, 6);
  }, [customer, customerOptions]);

  const updateLine = (key: string, patch: Partial<BillLineDraft>) => {
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const merged = { ...l, ...patch };
      // when stockId changes, auto-fill unit price from stock
      if (patch.stockId !== undefined) {
        const s = stock.find(x => x.id === patch.stockId);
        if (s) merged.unitPrice = s.price.toString();
      }
      return merged;
    }));
  };

  const addLine = () => setLines(prev => [...prev, newLine()]);
  const removeLine = (key: string) => setLines(prev => prev.length > 1 ? prev.filter(l => l.key !== key) : prev);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) return toast.error('Customer name is required');
    const cleanLines: BillLineInput[] = [];
    for (const l of lines) {
      const qty = Number(l.quantity);
      const up = Number(l.unitPrice);
      if (!l.stockId) return toast.error('Select a product for every line');
      if (!qty || qty <= 0) return toast.error('Quantity must be greater than 0');
      if (!up || up <= 0) return toast.error('Unit price must be greater than 0');
      const stockItem = stock.find(s => s.id === l.stockId);
      if (!stockItem) return toast.error('Invalid product');
      if (stockItem.quantity < qty) return toast.error(`${stockItem.name}: only ${stockItem.quantity} ${stockItem.unit} in stock`);
      // merge duplicate lines for the same product
      const existing = cleanLines.find(c => c.stockId === l.stockId);
      if (existing) {
        if (existing.unitPrice !== up) return toast.error(`Duplicate product "${stockItem.name}" with different price — combine them`);
        existing.quantity += qty;
      } else {
        cleanLines.push({ stockId: l.stockId, quantity: qty, unitPrice: up });
      }
    }
    if (paymentStatus === 'partial' && (paidNum <= 0 || paidNum >= billTotal)) {
      return toast.error('Partial amount must be between 0 and total bill');
    }
    const billId = onCreate({
      customer: customer.trim(),
      items: cleanLines,
      paymentStatus,
      amountPaid: paidNum,
      notes: notes || undefined,
    });
    if (!billId) return toast.error('Failed to create bill — check stock quantities');
    toast.success(`Bill ${billId} created — ₹${billTotal.toLocaleString('en-IN')} (${paymentStatus})`);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card rounded-xl border border-border shadow-2xl z-50 p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-accent" /> New Bill</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add multiple items for one customer in a single bill</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> Customer Name
            </label>
            <input
              required
              value={customer}
              onChange={e => { setCustomer(e.target.value); setShowCustomerSuggestions(true); }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
              placeholder="e.g. Sharma Kirana, Walk-in Customer..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Past Customers</p>
                {customerSuggestions.map(c => (
                  <button key={c} type="button" onMouseDown={() => { setCustomer(c); setShowCustomerSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm border-t border-border/50 flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-primary shrink-0" /> {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Items</label>
              <button type="button" onClick={addLine} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add another item
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line) => {
                const s = stock.find(x => x.id === line.stockId);
                const qtyNum = Number(line.quantity) || 0;
                const upNum = Number(line.unitPrice) || 0;
                const lineTotal = qtyNum * upNum;
                return (
                  <div key={line.key} className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-border bg-muted/20">
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        required
                        value={line.stockId}
                        onChange={e => updateLine(line.key, { stockId: e.target.value })}
                        className="w-full px-2 py-2 rounded-md border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="" disabled>Select product</option>
                        {stock.map(p => (
                          <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                            {p.name} ({p.category}) — {p.quantity} {p.unit} left
                          </option>
                        ))}
                      </select>
                      {s && <p className="text-[10px] text-muted-foreground mt-1">In stock: {s.quantity} {s.unit}</p>}
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        required type="number" min="1" max={s?.quantity || undefined}
                        value={line.quantity}
                        onChange={e => updateLine(line.key, { quantity: e.target.value })}
                        placeholder="Qty"
                        className="w-full px-2 py-2 rounded-md border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        required type="number" min="0" step="0.01"
                        value={line.unitPrice}
                        onChange={e => updateLine(line.key, { unitPrice: e.target.value })}
                        placeholder="Price"
                        className="w-full px-2 py-2 rounded-md border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right text-xs font-mono font-semibold text-card-foreground self-center">
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </div>
                    <div className="col-span-1 flex justify-end self-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        className="p-1 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bill summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Bill</span>
              <span className="text-lg font-bold text-card-foreground flex items-center"><IndianRupee className="w-4 h-4" />{billTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-success">Paid</span>
              <span className="font-mono text-success">₹{paidNum.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-destructive">Due</span>
              <span className="font-mono text-destructive">₹{dueNum.toLocaleString('en-IN')}</span>
            </div>
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
              <input required type="number" min="0.01" max={billTotal || undefined} step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={`Less than ${billTotal}`} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors text-foreground">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg gradient-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Create Bill — ₹{billTotal.toLocaleString('en-IN')}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
