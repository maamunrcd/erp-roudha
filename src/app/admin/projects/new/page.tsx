import { ProjectForm } from "@/features/projects/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New project</h1>
      <ProjectForm mode="create" />
    </div>
  );
}
