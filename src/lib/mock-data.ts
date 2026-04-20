import type { StockItem, StockMovement, SaleRecord, User } from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@stockmate.com', role: 'admin' },
  { id: '2', name: 'Staff Member', email: 'staff@stockmate.com', role: 'staff' },
];

// Default categories shown in the "Add Stock" dropdown.
// Users can add more on the fly via "+ Add new category".
export const DEFAULT_CATEGORIES = ['Wheat', 'Rice', 'Dal', 'Oil'] as const;

export const defaultStockItems: StockItem[] = [
  // Wheat brands
  { id: '1', name: 'Aashirvaad Atta', category: 'Wheat', quantity: 120, weight: 10, price: 520, unit: 'Bag', minQuantity: 30, lastUpdated: '2026-04-10', createdAt: '2026-01-15' },
  { id: '2', name: 'Shakti Bhog Atta', category: 'Wheat', quantity: 80, weight: 10, price: 480, unit: 'Bag', minQuantity: 25, lastUpdated: '2026-04-09', createdAt: '2026-01-20' },
  { id: '3', name: 'Local Wheat', category: 'Wheat', quantity: 45, weight: 50, price: 1800, unit: 'Sack', minQuantity: 50, lastUpdated: '2026-04-08', createdAt: '2026-02-01' },

  // Rice brands
  { id: '4', name: 'India Gate Basmati', category: 'Rice', quantity: 150, weight: 5, price: 650, unit: 'Bag', minQuantity: 40, lastUpdated: '2026-04-07', createdAt: '2026-02-10' },
  { id: '5', name: 'Daawat Basmati', category: 'Rice', quantity: 95, weight: 5, price: 600, unit: 'Bag', minQuantity: 30, lastUpdated: '2026-04-06', createdAt: '2026-02-15' },
  { id: '6', name: 'Local Sona Masoori', category: 'Rice', quantity: 0, weight: 25, price: 1400, unit: 'Sack', minQuantity: 20, lastUpdated: '2026-04-05', createdAt: '2026-03-01' },

  // Dal brands
  { id: '7', name: 'Tata Sampann Toor Dal', category: 'Dal', quantity: 60, weight: 1, price: 180, unit: 'Pouch', minQuantity: 25, lastUpdated: '2026-04-04', createdAt: '2026-03-05' },
  { id: '8', name: 'Fortune Moong Dal', category: 'Dal', quantity: 40, weight: 1, price: 160, unit: 'Pouch', minQuantity: 25, lastUpdated: '2026-04-03', createdAt: '2026-03-10' },
  { id: '9', name: 'Local Chana Dal', category: 'Dal', quantity: 18, weight: 1, price: 110, unit: 'Pouch', minQuantity: 20, lastUpdated: '2026-04-02', createdAt: '2026-03-15' },

  // Oil brands
  { id: '10', name: 'Fortune Sunflower Oil', category: 'Oil', quantity: 70, weight: 15, price: 1850, unit: 'Tins', minQuantity: 20, lastUpdated: '2026-04-10', createdAt: '2026-03-20' },
  { id: '11', name: 'Saffola Gold', category: 'Oil', quantity: 45, weight: 5, price: 850, unit: 'Tins', minQuantity: 15, lastUpdated: '2026-04-09', createdAt: '2026-03-21' },
  { id: '12', name: 'Dhara Mustard Oil', category: 'Oil', quantity: 30, weight: 1, price: 175, unit: 'Pouch', minQuantity: 20, lastUpdated: '2026-04-08', createdAt: '2026-03-22' },
];

export const defaultMovements: StockMovement[] = [
  { id: '1', stockId: '1', stockName: 'Aashirvaad Atta', type: 'in', quantity: 50, date: '2026-04-10', performedBy: 'Admin User', notes: 'New shipment' },
  { id: '2', stockId: '4', stockName: 'India Gate Basmati', type: 'out', quantity: 30, date: '2026-04-09', performedBy: 'Staff Member', notes: 'Sold to retailer' },
  { id: '3', stockId: '6', stockName: 'Local Sona Masoori', type: 'out', quantity: 20, date: '2026-04-06', performedBy: 'Staff Member', notes: 'Fully depleted' },
  { id: '4', stockId: '10', stockName: 'Fortune Sunflower Oil', type: 'in', quantity: 25, date: '2026-04-05', performedBy: 'Admin User' },
];

// Helper to keep mock sales in sync with payment fields
const sale = (
  id: string, billId: string, stockId: string, stockName: string, quantity: number,
  unitPrice: number, customer: string, date: string,
  paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid',
  amountPaid?: number,
): SaleRecord => {
  const totalPrice = quantity * unitPrice;
  const paid = paymentStatus === 'paid' ? totalPrice : paymentStatus === 'unpaid' ? 0 : (amountPaid ?? totalPrice / 2);
  return {
    id, billId, stockId, stockName, quantity, unitPrice, totalPrice,
    customer, date, paymentStatus, amountPaid: paid, amountDue: totalPrice - paid,
    performedBy: 'Staff Member',
  };
};

export const defaultSales: SaleRecord[] = [
  // Bill B1 — Sharma Kirana bought wheat + dal together
  sale('s1', 'B1', '1', 'Aashirvaad Atta', 80, 520, 'Sharma Kirana', '2026-04-10', 'paid'),
  sale('s2', 'B1', '7', 'Tata Sampann Toor Dal', 55, 180, 'Sharma Kirana', '2026-04-10', 'paid'),

  // Bill B2 — Verma Stores partial payment on multiple items
  sale('s3', 'B2', '2', 'Shakti Bhog Atta', 35, 480, 'Verma Stores', '2026-04-08', 'partial', 8000),
  sale('s4', 'B2', '12', 'Dhara Mustard Oil', 18, 175, 'Verma Stores', '2026-04-08', 'partial', 1500),

  // Bill B3 — overdue unpaid walk-in
  sale('s5', 'B3', '3', 'Local Wheat', 12, 1800, 'Walk-in Customer', '2026-03-20', 'unpaid'),

  // Bill B4 — Hotel Anand bought rice + oil together
  sale('s6', 'B4', '4', 'India Gate Basmati', 90, 650, 'Hotel Anand', '2026-04-09', 'paid'),
  sale('s7', 'B4', '10', 'Fortune Sunflower Oil', 40, 1850, 'Hotel Anand', '2026-04-09', 'paid'),

  // Bill B5 — Royal Caterers partial overdue
  sale('s8', 'B5', '5', 'Daawat Basmati', 45, 600, 'Royal Caterers', '2026-03-15', 'partial', 10000),

  // Single-item bills
  sale('s9', 'B6', '6', 'Local Sona Masoori', 20, 1400, 'Walk-in Customer', '2026-04-05', 'paid'),
  sale('s10', 'B7', '8', 'Fortune Moong Dal', 30, 160, 'Walk-in Customer', '2026-04-03', 'paid'),
  sale('s11', 'B8', '9', 'Local Chana Dal', 12, 110, 'Walk-in Customer', '2026-04-02', 'paid'),
  sale('s12', 'B9', '11', 'Saffola Gold', 22, 850, 'Walk-in Customer', '2026-04-06', 'paid'),
];
