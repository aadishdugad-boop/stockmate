import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { StockTable } from '@/components/StockTable';

export const Route = createFileRoute('/stock')({
  component: StockPage,
});

function StockPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your inventory items</p>
        </div>
        <StockTable />
      </div>
    </AppLayout>
  );
}
