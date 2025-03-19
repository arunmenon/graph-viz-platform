"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Database, Home, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Database className="h-6 w-6 text-blue-500" />
          <span className="text-xl">Graph Viz Platform</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/explore">
              <Database className="mr-2 h-4 w-4" />
              Explore
            </Link>
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </nav>
      </div>
    </header>
  );
}
