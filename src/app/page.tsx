import { Header } from "@/components/Header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Database, FileSearch, Share2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Interactive Graph Visualization Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Query, explore, and visualize your graph data with an intuitive interface
          </p>
          <Button size="lg" asChild>
            <Link href="/explore">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <FileSearch className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Query Your Data</CardTitle>
              <CardDescription>
                Ask questions in natural language and get visual responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Transform complex questions into graph queries and explore the connections visually.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link href="/explore?action=query">Learn more</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Compliance Taxonomy</CardTitle>
              <CardDescription>
                Explore the regulatory compliance knowledge graph
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Navigate through compliance relationships, standards, and regulatory frameworks in an interactive visualization.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link href="/explore?action=browse">Explore Taxonomy</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Share2 className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Share & Export</CardTitle>
              <CardDescription>
                Collaborate with your team by sharing graph visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Export your discoveries as interactive graphs, images, or data files for presentations.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link href="/explore?action=export">Learn more</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Graph Viz Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
