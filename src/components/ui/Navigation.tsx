"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Runs" },
  { href: "/new", label: "New Run" },
  { href: "/admin/prompts", label: "Prompts" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#272a3a] bg-[#0f1018]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#e2e4f0]">MyDash</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#1e2030] text-[#e2e4f0]"
                      : "text-[#9099b8] hover:text-[#e2e4f0] hover:bg-[#161820]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
