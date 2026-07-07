import { Select } from "@/components/ui/Input";
import { CUSTOMER_STATUSES } from "@/lib/constants/customer-status";

interface CustomerStatusSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  className?: string;
}

/** Shared status dropdown — same options for edit form and list filter */
export function CustomerStatusSelect({
  id,
  value,
  onChange,
  allowAll = false,
  className,
}: CustomerStatusSelectProps) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowAll && <option value="">All statuses</option>}
      {CUSTOMER_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}
