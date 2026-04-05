"use client";
import Link from "next/link";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/recorder", label: "Recorder" },
  ] as const;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <nav className="flex gap-5 text-lg text-zinc-100">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to} className="transition-colors hover:text-cyan-300">
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
