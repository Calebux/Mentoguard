import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/portfolio", label: "Portfolio" },
  { href: "/dashboard/rules", label: "Rules" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/identity", label: "Identity" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-6 bg-surface/80 backdrop-blur sticky top-0 z-50">
        <Link href="/" className="font-bold text-lg">
          🛡️ <span className="text-accent-primary">MentoGuard</span>
        </Link>

        <nav className="flex gap-4 ml-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-text-secondary hover:text-text-primary transition"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
