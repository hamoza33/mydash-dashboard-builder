"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VariablesForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: "",
    lfProductId: "",
    dateFrom: "",
    dateTo: "",
    defaultCc: "",
    outputFilename: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create run");
      }

      const run = await res.json();
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[#f87171] text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="productName" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
          Product Name *
        </label>
        <input
          type="text"
          id="productName"
          name="productName"
          required
          value={formData.productName}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] placeholder-[#9099b8] focus:outline-none focus:border-[#60a5fa] transition-colors"
          placeholder="e.g. My Product"
        />
      </div>

      <div>
        <label htmlFor="lfProductId" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
          LightFunnels Product ID *
        </label>
        <input
          type="text"
          id="lfProductId"
          name="lfProductId"
          required
          value={formData.lfProductId}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] placeholder-[#9099b8] focus:outline-none focus:border-[#60a5fa] transition-colors"
          placeholder="e.g. prod_12345"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
            Date From *
          </label>
          <input
            type="date"
            id="dateFrom"
            name="dateFrom"
            required
            value={formData.dateFrom}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] focus:outline-none focus:border-[#60a5fa] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
            Date To *
          </label>
          <input
            type="date"
            id="dateTo"
            name="dateTo"
            required
            value={formData.dateTo}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] focus:outline-none focus:border-[#60a5fa] transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="defaultCc" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
          Default Country Code
        </label>
        <input
          type="text"
          id="defaultCc"
          name="defaultCc"
          value={formData.defaultCc}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] placeholder-[#9099b8] focus:outline-none focus:border-[#60a5fa] transition-colors"
          placeholder="e.g. 966"
        />
      </div>

      <div>
        <label htmlFor="outputFilename" className="block text-sm font-medium text-[#e2e4f0] mb-1.5">
          Output Filename
        </label>
        <input
          type="text"
          id="outputFilename"
          name="outputFilename"
          value={formData.outputFilename}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg bg-[#1e2030] border border-[#272a3a] text-[#e2e4f0] placeholder-[#9099b8] focus:outline-none focus:border-[#60a5fa] transition-colors"
          placeholder="Auto-generated if empty"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg bg-[#60a5fa] hover:bg-[#60a5fa]/90 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Start Pipeline Run"}
      </button>
    </form>
  );
}
