import { CustomerEditForm } from "@/features/customers/components/CustomerEditForm";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit customer</h1>
      <CustomerEditForm customerId={id} />
    </div>
  );
}
