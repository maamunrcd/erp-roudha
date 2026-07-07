import Link from "next/link";
import { Suspense } from "react";
import { CustomerMatrix } from "@/features/customers/components/CustomerMatrix";
import { Button } from "@/components/ui/Button";
import { CustomerTableSkeleton } from "@/components/ui/Skeleton";

export default function CustomersPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/admin/customers/new">
          <Button>Add customer</Button>
        </Link>
      </div>
      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomerMatrix />
      </Suspense>
    </div>
  );
}
