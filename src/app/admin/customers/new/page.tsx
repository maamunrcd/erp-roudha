import { CustomerCreatePage } from "@/features/customers/components/CustomerCreatePage";

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Add customer</h1>
      <CustomerCreatePage />
    </div>
  );
}
