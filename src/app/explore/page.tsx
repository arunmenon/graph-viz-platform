"use client";

import { Header } from "@/components/Header";
import { ExploreContent } from "@/components/ExploreContent";

export default function ExplorePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ExploreContent />
    </div>
  );
}
