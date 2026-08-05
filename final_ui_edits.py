import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add Timezone selector in the Reminder dialog
timezone_ui = """                <div className="space-y-1.5">
                  <Label className="text-[10px]">{t("টাইমজোন", "Timezone")}</Label>
                  <Select value={reminderConfig.timezone} onValueChange={(v) => setReminderConfig(prev => ({ ...prev, timezone: v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                        {Intl.DateTimeFormat().resolvedOptions().timeZone} ({t("ডিফল্ট", "Default")})
                      </SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>"""

content = content.replace(
    '<div className="grid grid-cols-2 gap-3 pt-2">',
    f'<div className="grid grid-cols-2 gap-3 pt-2">\n{timezone_ui}'
)

# Add Import History section in the Dialog
history_ui = """            {importHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("ইম্পোর্ট হিস্টরি", "Import History")}</h4>
                <div className="space-y-2">
                  {importHistory.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded border bg-secondary/10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="text-[8px] text-muted-foreground">{h.count} {t("টি আইটেম", "items")} ({h.type})</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[8px] text-destructive" onClick={() => rollbackImport(h.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> {t("রোলব্যাক", "Rollback")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}"""

# Insert before the mapping UI in the dialog
content = content.replace(
    '<div className="space-y-3">\n              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("কলাম ম্যাপিং", "Column Mapping")}</h4>',
    f'{history_ui}\n\n            <div className="space-y-3">\n              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{{t("কলাম ম্যাপিং", "Column Mapping")}}</h4>'
)

# Add "Test Notification" button UI
test_btn = """              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={testNotification}>
                <Bell className="h-3 w-3" /> {t("টেস্ট নোটিফিকেশন", "Test Notification")}
              </Button>"""

content = content.replace(
    '<DialogTitle>{t("রিমাইন্ডার সেটআপ", "Reminder Setup")}</DialogTitle>',
    f'<DialogTitle className="flex items-center justify-between w-full">\n                {t("রিমাইন্ডার সেটআপ", "Reminder Setup")}\n                {test_btn}\n              </DialogTitle>'
)

with open(file_path, "w") as f:
    f.write(content)
