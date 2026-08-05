import { useQuery } from "@tanstack/react-query";
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Download,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { useState, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TestReportView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["playwright-report"],
    queryFn: async () => {
      // In a real env, this would fetch from /playwright-report/test-results.json
      // For this preview, we'll mock the structure based on Playwright's JSON reporter
      const mock = {
        stats: { duration: 45000, expected: 12, unexpected: 1, flaky: 0, skipped: 0 },
        suites: [
          {
            title: "Medicine Sync",
            specs: [
              { title: "syncs favorites to profile", status: "passed", duration: 1200 },
              { title: "handles duplicate medicines during sync", status: "passed", duration: 1500 },
            ]
          },
          {
            title: "Share Links",
            specs: [
              { title: "generates private token for sharing", status: "passed", duration: 800 },
              { title: "expires token after set time", status: "failed", error: "Timed out waiting for expiry redirect", duration: 5000 },
            ]
          },
          {
            title: "Reminders",
            specs: [
              { title: "creates daily reminder alert", status: "passed", duration: 1100 },
            ]
          }
        ]
      };
      return mock;
    }
  });

  const allTests = useMemo(() => {
    if (!reportData) return [];
    return reportData.suites.flatMap(suite => 
      suite.specs.map(spec => ({ ...spec, suite: suite.title, id: `${suite.title}-${spec.title}` }))
    );
  }, [reportData]);

  const filteredTests = useMemo(() => {
    return allTests.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                           t.suite.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTests, search, statusFilter]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading report...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total" value={(reportData?.stats.expected || 0) + (reportData?.stats.unexpected || 0)} icon={Terminal} />
        <StatCard title="Passed" value={reportData?.stats.expected || 0} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Failed" value={reportData?.stats.unexpected || 0} icon={XCircle} color="text-destructive" />
        <StatCard title="Duration" value={`${((reportData?.stats.duration || 0) / 1000).toFixed(1)}s`} icon={Clock} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search tests..." 
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Suite / Title</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Duration</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTests.map((test) => (
              <TableRow key={test.id} className={test.status === "failed" ? "bg-destructive/5" : ""}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {test.suite}
                    </span>
                    <span className="text-sm font-medium">{test.title}</span>
                    {test.error && (
                      <div className="mt-2 rounded bg-destructive/10 p-2 font-mono text-[10px] text-destructive whitespace-pre-wrap">
                        <span className="font-bold">Root Cause:</span> {test.error}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={test.status === "passed" ? "secondary" : "destructive"} className="capitalize">
                    {test.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {test.duration}ms
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
