import type { StockItem, SaleRecord } from './types';
import { getStockStatus } from './types';

export interface BrandStock {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  price: number;
  value: number;
  status: 'in-stock' | 'low' | 'out';
}

export interface CategorySummary {
  category: string;
  totalQuantity: number;
  totalValue: number;
  brandCount: number;
  lowCount: number;
  outCount: number;
  brands: BrandStock[];
}

export function buildCategorySummaries(stock: StockItem[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const item of stock) {
    if (!map.has(item.category)) {
      map.set(item.category, {
        category: item.category,
        totalQuantity: 0,
        totalValue: 0,
        brandCount: 0,
        lowCount: 0,
        outCount: 0,
        brands: [],
      });
    }
    const c = map.get(item.category)!;
    const status = getStockStatus(item);
    c.totalQuantity += item.quantity;
    c.totalValue += item.quantity * item.price;
    c.brandCount += 1;
    if (status === 'low') c.lowCount += 1;
    if (status === 'out') c.outCount += 1;
    c.brands.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity,
      price: item.price,
      value: item.quantity * item.price,
      status,
    });
  }
  return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
}

export interface BrandSales {
  stockId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export function brandSalesForCategory(
  category: string,
  stock: StockItem[],
  sales: SaleRecord[]
): BrandSales[] {
  const inCategory = new Set(stock.filter(s => s.category === category).map(s => s.id));
  const map = new Map<string, BrandSales>();
  for (const sale of sales) {
    if (!inCategory.has(sale.stockId)) continue;
    if (!map.has(sale.stockId)) {
      map.set(sale.stockId, { stockId: sale.stockId, name: sale.stockName, unitsSold: 0, revenue: 0 });
    }
    const b = map.get(sale.stockId)!;
    b.unitsSold += sale.quantity;
    b.revenue += sale.totalPrice;
  }
  // include zero-sales brands too
  for (const item of stock.filter(s => s.category === category)) {
    if (!map.has(item.id)) {
      map.set(item.id, { stockId: item.id, name: item.name, unitsSold: 0, revenue: 0 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.unitsSold - a.unitsSold);
}

export function categorySalesTotals(stock: StockItem[], sales: SaleRecord[]) {
  const idToCat = new Map(stock.map(s => [s.id, s.category]));
  const map = new Map<string, { units: number; revenue: number }>();
  for (const sale of sales) {
    const cat = idToCat.get(sale.stockId) ?? 'Unknown';
    if (!map.has(cat)) map.set(cat, { units: 0, revenue: 0 });
    const c = map.get(cat)!;
    c.units += sale.quantity;
    c.revenue += sale.totalPrice;
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, units: v.units, revenue: v.revenue }))
    .sort((a, b) => b.units - a.units);
}

export function restockPriority(stock: StockItem[]) {
  return stock
    .map(item => {
      const status = getStockStatus(item);
      const ratio = item.minQuantity > 0 ? item.quantity / item.minQuantity : 1;
      // higher score = more urgent
      const score = status === 'out' ? 100 : status === 'low' ? Math.round((1 - ratio) * 80 + 20) : 0;
      return { item, status, ratio, score };
    })
    .filter(r => r.status !== 'in-stock')
    .sort((a, b) => b.score - a.score);
}

export function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
