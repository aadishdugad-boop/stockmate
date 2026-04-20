export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export const UNIT_OPTIONS = ['Tins', 'Box', 'Bag', 'Sack', 'Piece', 'Pouch'] as const;
export type UnitType = typeof UNIT_OPTIONS[number] | string;

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight: number;
  price: number;
  unit: string;
  minQuantity: number;
  lastUpdated: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  stockId: string;
  stockName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  performedBy: string;
  notes?: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface SaleRecord {
  id: string;
  /** Bill identifier — multiple SaleRecords sharing the same billId belong to the same invoice. */
  billId: string;
  stockId: string;
  stockName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customer: string;
  date: string;
  paymentStatus: PaymentStatus;
  /** Amount allocated to THIS line item from the bill payment. Bill total = sum of line totalPrice; bill paid = sum of line amountPaid. */
  amountPaid: number;
  amountDue: number;
  performedBy?: string;
  notes?: string;
}

export type StockStatus = 'in-stock' | 'low' | 'out';

export function getStockStatus(item: StockItem): StockStatus {
  if (item.quantity === 0) return 'out';
  if (item.quantity <= item.minQuantity) return 'low';
  return 'in-stock';
}
