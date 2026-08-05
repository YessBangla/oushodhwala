import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserAuditLogs } from "@/lib/user-meds.functions";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Clock, Activity, Search, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/account/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const t = useT();
  const { user } = useAuth();
  const getLogs = useServerFn(getUserAuditLogs);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["user-audit-logs"],
    enabled: !!user,
    queryFn: () => getLogs(),
  });

  const logs = Array.isArray(logsData) ? (logsData as any[]) : [];

  const actions = useMemo(() => {
    return ["all", ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(search.toLowerCase());
      
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      
      let matchesDate = true;
      if (dateRange.from || dateRange.to) {
        const logDate = new Date(log.created_at);
        if (dateRange.from && logDate < startOfDay(new Date(dateRange.from))) matchesDate = false;
        if (dateRange.to && logDate > endOfDay(new Date(dateRange.to))) matchesDate = false;
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, search, actionFilter, dateRange]);

  const exportLogs = (formatType: "csv" | "json") => {
    if (!filteredLogs.length) return;
    
    let blob: Blob;
    let fileName: string;

    if (formatType === "json") {
      blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
      fileName = "audit-logs.json";
    } else {
      const csv = [
        ["Date", "Action", "Metadata"],
        ...filteredLogs.map(l => [l.created_at, l.action, JSON.stringify(l.metadata)])
      ].map(r => r.join(",")).join("\n");
      blob = new Blob([csv], { type: "text/csv" });
      fileName = "audit-logs.csv";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/account">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              {t("অডিট লগ", "Audit Logs")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("আপনার অ্যাকাউন্টের সকল কার্যক্রমের বিস্তারিত তালিকা।", "Detailed history of your account activities.")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportLogs("json")} disabled={!filteredLogs.length}>
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportLogs("csv")} disabled={!filteredLogs.length}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t("অনুসন্ধান করুন...", "Search...")}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("অ্যাকশন ফিল্টার", "Filter Action")} />
          </SelectTrigger>
          <SelectContent>
            {actions.map(a => (
              <SelectItem key={a} value={a}>
                {a === "all" ? t("সব অ্যাকশন", "All Actions") : a.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
           <Input 
            type="date" 
            className="text-xs h-10" 
            value={dateRange.from} 
            onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))}
           />
           <Input 
            type="date" 
            className="text-xs h-10" 
            value={dateRange.to} 
            onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))}
           />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t("তারিখ", "Date")}</TableHead>
              <TableHead>{t("অ্যাকশন", "Action")}</TableHead>
              <TableHead>{t("বিস্তারিত", "Metadata")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Clock className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  {t("কোনো লগ পাওয়া যায়নি।", "No logs found.")}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-medium">
                    {log.created_at ? format(new Date(log.created_at), "PPp") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {log.action?.replace(/_/g, " ") || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[10px] text-muted-foreground font-mono">
                    {JSON.stringify(log.metadata || {})}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
