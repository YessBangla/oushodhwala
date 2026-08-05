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
import { Download, Filter, ArrowLeft, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/account/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const t = useT();
  const { user } = useAuth();
  const getLogs = useServerFn(getUserAuditLogs);
  const [filter, setFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["user-audit-logs"],
    enabled: !!user,
    queryFn: () => getLogs(),
  });

  const filteredLogs = logs?.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(log.metadata).toLowerCase().includes(filter.toLowerCase())
  ) || [];

  const exportLogs = () => {
    if (!logs) return;
    const csv = [
      ["Date", "Action", "Metadata"],
      ...logs.map(l => [l.created_at, l.action, JSON.stringify(l.metadata)])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
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
        <Button variant="outline" size="sm" onClick={exportLogs} disabled={!logs?.length}>
          <Download className="mr-2 h-4 w-4" />
          {t("এক্সপোর্ট", "Export")}
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t("অ্যাকশন বা তথ্য দিয়ে ফিল্টার করুন...", "Filter by action or metadata...")}
            className="pl-9"
            value={filter}
            onChange={e => setFilter(e.target.value)}
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
                    {format(new Date(log.created_at), "PPp")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[10px] text-muted-foreground font-mono">
                    {JSON.stringify(log.metadata)}
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
