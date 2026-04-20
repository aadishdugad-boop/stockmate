import type { StockItem, StockMovement, SaleRecord } from './types';
import { defaultStockItems, defaultMovements, defaultSales } from './mock-data';

// v4: SaleRecord now carries billId for multi-item bills
const KEYS = {
  stock: 'stockmate_stock_v2',
  movements: 'stockmate_movements_v2',
  sales: 'stockmate_sales_v4',
  theme: 'stockmate_theme',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getStock(): StockItem[] {
  return get(KEYS.stock, defaultStockItems);
}
export function setStock(items: StockItem[]) {
  set(KEYS.stock, items);
}

export function getMovements(): StockMovement[] {
  return get(KEYS.movements, defaultMovements);
}
export function setMovements(m: StockMovement[]) {
  set(KEYS.movements, m);
}

export function getSales(): SaleRecord[] {
  return get(KEYS.sales, defaultSales);
}
export function setSales(s: SaleRecord[]) {
  set(KEYS.sales, s);
}

export function getTheme(): 'light' | 'dark' {
  return get(KEYS.theme, 'light') as 'light' | 'dark';
}
export function setThemeStorage(t: 'light' | 'dark') {
  set(KEYS.theme, t);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
