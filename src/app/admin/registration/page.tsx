import { RegistrationPanel } from "@/features/registration/components/RegistrationPanel";

export default function RegistrationPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Registration</h1>
        <p className="mt-1 text-sm text-muted-text">
          Track agreement → mutation → registry → handover for each enrollment.
        </p>
      </div>
      <RegistrationPanel />
    </div>
  );
}
