import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update Import History UI with Export CSV button
history_item_old = """                      <Button variant="ghost" size="sm" className="h-7 text-[8px] text-destructive" onClick={() => rollbackImport(h.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> {t("রোলব্যাক", "Rollback")}
                      </Button>"""

history_item_new = """                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-[8px]" onClick={() => exportHistoryBatch(h.id)}>
                          <Download className="h-3 w-3 mr-1" /> {t("এক্সপোর্ট CSV", "Export CSV")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[8px] text-destructive" onClick={() => rollbackImport(h.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> {t("রোলব্যাক", "Rollback")}
                        </Button>
                      </div>"""

content = content.replace(history_item_old, history_item_new)

# 2. Add Delivery Logs Dialog
logs_dialog = """
      {/* Delivery Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("নোটিফিকেশন ডেলিভারি লগ", "Notification Delivery Logs")}</DialogTitle>
            <DialogDescription>{t("টাইমজোন এবং ডেলিভারি স্ট্যাটাস চেক করুন।", "Check timezone and delivery status.")}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {notificationHistory.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/5 text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{new Date(log.time).toLocaleString()}</span>
                      <Badge variant={log.status === 'success' ? 'secondary' : log.status === 'failed' ? 'destructive' : 'outline'} className="text-[8px] h-4">
                        {log.status === 'success' ? t('সফল', 'Success') : log.status === 'failed' ? t('ব্যর্থ', 'Failed') : t('পেন্ডিং', 'Pending')}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Timezone: {log.timezone}</span>
                    {log.error && <span className="text-destructive font-mono text-[9px]">{log.error}</span>}
                  </div>
                  {log.status === 'failed' && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => triggerNotification({ id: log.reminderId, timezone: log.timezone })}>
                      <RotateCcw className="h-3 w-3 mr-1" /> {t("আবার চেষ্টা করুন", "Retry")}
                    </Button>
                  )}
                </div>
              ))}
              {notificationHistory.length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-xs">{t("কোন লগ পাওয়া যায়নি।", "No logs found.")}</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
"""

# Insert before the last closing div of the component
content = content.replace('    </div>\n  );\n}', logs_dialog + '\n    </div>\n  );\n}')

# 3. Add "View Logs" button to the header or reminder setup
logs_btn = """<Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowLogs(true)}>
                <History className="h-3 w-3" /> {t("ডেলিভারি লগ", "Delivery Logs")}
              </Button>"""

content = content.replace(
    '<Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={testNotification}>',
    f'{logs_btn}\n              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={testNotification}>'
)

with open(file_path, "w") as f:
    f.write(content)
