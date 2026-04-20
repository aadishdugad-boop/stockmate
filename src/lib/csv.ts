import Papa from 'papaparse';
import type { StockItem } from './types';
import { generateId } from './storage';

export function exportStockToCSV(items: StockItem[]): string {
  return Papa.unparse(items.map(i => ({
    Name: i.name,
    Category: i.category,
    Quantity: i.quantity,
    Weight: i.weight,
    Price: i.price,
    Unit: i.unit,
    'Min Quantity': i.minQuantity,
    'Last Updated': i.lastUpdated,
  })));
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVFile(file: File): Promise<StockItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const items: StockItem[] = (results.data as Record<string, string>[]).map(row => ({
          id: generateId(),
          name: row['Name'] || row['name'] || '',
          category: row['Category'] || row['category'] || 'Uncategorized',
          quantity: Number(row['Quantity'] || row['quantity'] || 0),
          weight: Number(row['Weight'] || row['weight'] || 0),
          price: Number(row['Price'] || row['price'] || 0),
          unit: row['Unit'] || row['unit'] || 'Box',
          minQuantity: Number(row['Min Quantity'] || row['minQuantity'] || 10),
          lastUpdated: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
        }));
        resolve(items.filter(i => i.name));
      },
      error: reject,
    });
  });
}
