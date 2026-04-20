import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { StockItem, StockMovement, SaleRecord, PaymentStatus } from '@/lib/types';
import * as storage from '@/lib/storage';
import { defaultStockItems, defaultMovements, defaultSales } from '@/lib/mock-data';

export interface BillLineInput {
  stockId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateBillPayload {
  customer: string;
  items: BillLineInput[];
  paymentStatus: PaymentStatus;
  /** Total amount paid across the whole bill (only used when paymentStatus === 'partial') */
  amountPaid: number;
  notes?: string;
  date?: string;
}

interface StockContextType {
  stock: StockItem[];
  movements: StockMovement[];
  sales: SaleRecord[];
  addStock: (item: Omit<StockItem, 'id' | 'lastUpdated' | 'createdAt'>) => void;
  updateStock: (id: string, updates: Partial<StockItem>) => void;
  deleteStock: (id: string) => void;
  stockIn: (id: string, qty: number, performedBy: string, notes?: string) => void;
  /** Create a multi-item bill in one shot. */
  createBill: (performedBy: string, payload: CreateBillPayload) => string | null;
  addSale: (sale: Omit<SaleRecord, 'id'>) => void;
  updateSale: (id: string, updates: Partial<SaleRecord>) => void;
  deleteSale: (id: string) => void;
  updateBillPayment: (billId: string, paymentStatus: PaymentStatus, amountPaid: number) => void;
  deleteBill: (billId: string) => void;
  importStock: (items: StockItem[]) => void;
  refreshData: () => void;
}

const StockContext = createContext<StockContextType | null>(null);

export function StockProvider({ children }: { children: ReactNode }) {
  const [stock, setStockState] = useState<StockItem[]>(defaultStockItems);
  const [movements, setMovementsState] = useState<StockMovement[]>(defaultMovements);
  const [sales, setSalesState] = useState<SaleRecord[]>(defaultSales);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setStockState(storage.getStock());
    setMovementsState(storage.getMovements());
    setSalesState(storage.getSales());
  }, []);

  const setStock = useCallback((items: StockItem[]) => {
    setStockState(items);
    storage.setStock(items);
  }, []);

  const setMovements = useCallback((m: StockMovement[]) => {
    setMovementsState(m);
    storage.setMovements(m);
  }, []);

  const setSales = useCallback((s: SaleRecord[]) => {
    setSalesState(s);
    storage.setSales(s);
  }, []);

  const today = () => new Date().toISOString().split('T')[0];

  const addStock = useCallback((item: Omit<StockItem, 'id' | 'lastUpdated' | 'createdAt'>) => {
    setStockState(prev => {
      const newItem: StockItem = { ...item, id: storage.generateId(), lastUpdated: today(), createdAt: today() };
      const updated = [...prev, newItem];
      storage.setStock(updated);
      return updated;
    });
  }, []);

  const updateStock = useCallback((id: string, updates: Partial<StockItem>) => {
    setStockState(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates, lastUpdated: today() } : s);
      storage.setStock(updated);
      return updated;
    });
  }, []);

  const deleteStock = useCallback((id: string) => {
    setStockState(prev => {
      const updated = prev.filter(s => s.id !== id);
      storage.setStock(updated);
      return updated;
    });
  }, []);

  const stockIn = useCallback((id: string, qty: number, performedBy: string, notes?: string) => {
    setStockState(prev => {
      const item = prev.find(s => s.id === id);
      if (!item) return prev;
      const updated = prev.map(s => s.id === id ? { ...s, quantity: s.quantity + qty, lastUpdated: today() } : s);
      storage.setStock(updated);

      const mov: StockMovement = { id: storage.generateId(), stockId: id, stockName: item.name, type: 'in', quantity: qty, date: today(), performedBy, notes };
      setMovementsState(prevM => {
        const newM = [mov, ...prevM];
        storage.setMovements(newM);
        return newM;
      });

      return updated;
    });
  }, []);

  const createBill = useCallback((performedBy: string, payload: CreateBillPayload): string | null => {
    const date = payload.date || today();
    const billId = 'BILL-' + storage.generateId().toUpperCase();
    let success = false;

    setStockState(prev => {
      // Validate quantities first
      for (const line of payload.items) {
        const item = prev.find(s => s.id === line.stockId);
        if (!item || item.quantity < line.quantity) return prev;
      }

      const updatedStock = prev.map(s => {
        const line = payload.items.find(l => l.stockId === s.id);
        return line ? { ...s, quantity: s.quantity - line.quantity, lastUpdated: date } : s;
      });
      storage.setStock(updatedStock);

      const billTotal = payload.items.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      const billPaid = payload.paymentStatus === 'paid' ? billTotal
        : payload.paymentStatus === 'unpaid' ? 0
        : Math.min(Math.max(payload.amountPaid, 0), billTotal);

      // Allocate bill-level payment proportionally across line items
      let allocated = 0;
      const newSales: SaleRecord[] = payload.items.map((line, idx) => {
        const item = prev.find(s => s.id === line.stockId)!;
        const lineTotal = line.quantity * line.unitPrice;
        let linePaid: number;
        if (idx === payload.items.length - 1) {
          linePaid = Math.max(0, billPaid - allocated);
        } else {
          linePaid = billTotal > 0 ? Math.round((lineTotal / billTotal) * billPaid * 100) / 100 : 0;
          allocated += linePaid;
        }
        linePaid = Math.min(linePaid, lineTotal);
        return {
          id: storage.generateId(),
          billId,
          stockId: line.stockId,
          stockName: item.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: lineTotal,
          customer: payload.customer,
          date,
          paymentStatus: payload.paymentStatus,
          amountPaid: linePaid,
          amountDue: lineTotal - linePaid,
          performedBy,
          notes: payload.notes,
        };
      });

      const newMovs: StockMovement[] = payload.items.map(line => {
        const item = prev.find(s => s.id === line.stockId)!;
        return {
          id: storage.generateId(),
          stockId: line.stockId,
          stockName: item.name,
          type: 'out',
          quantity: line.quantity,
          date,
          performedBy,
          notes: `Bill ${billId} — ${payload.customer}${payload.notes ? ` — ${payload.notes}` : ''}`,
        };
      });

      setMovementsState(prevM => {
        const m = [...newMovs, ...prevM];
        storage.setMovements(m);
        return m;
      });
      setSalesState(prevS => {
        const s = [...newSales, ...prevS];
        storage.setSales(s);
        return s;
      });

      success = true;
      return updatedStock;
    });

    return success ? billId : null;
  }, []);

  const updateSale = useCallback((id: string, updates: Partial<SaleRecord>) => {
    setSalesState(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const merged = { ...s, ...updates };
        merged.totalPrice = merged.quantity * merged.unitPrice;
        if (merged.paymentStatus === 'paid') merged.amountPaid = merged.totalPrice;
        else if (merged.paymentStatus === 'unpaid') merged.amountPaid = 0;
        merged.amountPaid = Math.min(Math.max(merged.amountPaid, 0), merged.totalPrice);
        merged.amountDue = merged.totalPrice - merged.amountPaid;
        return merged;
      });
      storage.setSales(updated);
      return updated;
    });
  }, []);

  const deleteSale = useCallback((id: string) => {
    setSalesState(prev => {
      const updated = prev.filter(s => s.id !== id);
      storage.setSales(updated);
      return updated;
    });
  }, []);

  const addSale = useCallback((sale: Omit<SaleRecord, 'id'>) => {
    setSalesState(prev => {
      const newS = [{ ...sale, id: storage.generateId() }, ...prev];
      storage.setSales(newS);
      return newS;
    });
  }, []);

  const updateBillPayment = useCallback((billId: string, paymentStatus: PaymentStatus, amountPaid: number) => {
    setSalesState(prev => {
      const linesOfBill = prev.filter(s => s.billId === billId);
      if (linesOfBill.length === 0) return prev;
      const billTotal = linesOfBill.reduce((sum, l) => sum + l.totalPrice, 0);
      const billPaid = paymentStatus === 'paid' ? billTotal
        : paymentStatus === 'unpaid' ? 0
        : Math.min(Math.max(amountPaid, 0), billTotal);

      // proportional allocation
      let allocated = 0;
      const allocations = new Map<string, number>();
      linesOfBill.forEach((l, idx) => {
        let linePaid: number;
        if (idx === linesOfBill.length - 1) {
          linePaid = Math.max(0, billPaid - allocated);
        } else {
          linePaid = billTotal > 0 ? Math.round((l.totalPrice / billTotal) * billPaid * 100) / 100 : 0;
          allocated += linePaid;
        }
        allocations.set(l.id, Math.min(linePaid, l.totalPrice));
      });

      const updated = prev.map(s => {
        if (s.billId !== billId) return s;
        const linePaid = allocations.get(s.id) ?? 0;
        return { ...s, paymentStatus, amountPaid: linePaid, amountDue: s.totalPrice - linePaid };
      });
      storage.setSales(updated);
      return updated;
    });
  }, []);

  const deleteBill = useCallback((billId: string) => {
    setSalesState(prev => {
      const updated = prev.filter(s => s.billId !== billId);
      storage.setSales(updated);
      return updated;
    });
  }, []);

  const importStock = useCallback((items: StockItem[]) => {
    setStockState(prev => {
      const updated = [...prev, ...items];
      storage.setStock(updated);
      return updated;
    });
  }, []);

  const refreshData = useCallback(() => {
    setStockState(storage.getStock());
    setMovementsState(storage.getMovements());
    setSalesState(storage.getSales());
  }, []);

  return (
    <StockContext.Provider value={{ stock, movements, sales, addStock, updateStock, deleteStock, stockIn, createBill, addSale, updateSale, deleteSale, updateBillPayment, deleteBill, importStock, refreshData }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be inside StockProvider');
  return ctx;
}
