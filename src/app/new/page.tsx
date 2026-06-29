import VariablesForm from "@/components/ui/VariablesForm";

export default function NewRunPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#e2e4f0] mb-6">
        New Pipeline Run
      </h1>
      <div className="p-6 rounded-xl bg-[#0f1018] border border-[#272a3a]">
        <VariablesForm />
      </div>
    </div>
  );
}
