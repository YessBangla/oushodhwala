import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add Conflict Detection & ICS Export Logic
# Add state for conflicts and filters
content = content.replace(
    'const [showLogs, setShowLogs] = useState(false);',
    'const [showLogs, setShowLogs] = useState(false);\n  const [logFilter, setLogFilter] = useState<string>("all");'
)

# Function to detect conflicts
conflict_logic = """
  const checkReminderConflicts = (time: string) => {
    const existing = items.filter(i => i.reminder?.time === time && i.id !== configProduct?.id);
    return existing;
  };

  const exportToICS = (reminder: any, product: any) => {
    const [hours, minutes] = reminder.time.split(':');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
    const end = new Date(start.getTime() + 30 * 60000); // 30 mins duration
    
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Medicine: ${product.name}`,
      `DESCRIPTION:Take ${product.name} (${product.strength}). Notes: ${reminder.notes || 'N/A'}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      'RRULE:FREQ=DAILY;INTERVAL=1',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\\r\\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.name}-reminder.ics`;
    a.click();
  };
"""

# Insert new functions
content = content.replace(
    '  const triggerNotification = async (reminder: any, attempt = 1) => {',
    conflict_logic + '\n  const triggerNotification = async (reminder: any, attempt = 1) => {'
)

# 2. Update Reminder Config Dialog with Notes and Conflict Warning
reminder_ui_old = """                <div className="grid grid-cols-2 gap-3 pt-2">"""
reminder_ui_new = """                {checkReminderConflicts(reminderConfig.time).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-md flex items-start gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-[10px] text-amber-800">
                      <strong>{t("সময় ওভারল্যাপ করছে", "Time Overlap")}:</strong> {t("এই সময়ে ইতিমধ্যে", "Already")} {checkReminderConflicts(reminderConfig.time).length} {t("টি ঔষধের রিমাইন্ডার সেট করা আছে।", "medicine reminders set for this time.")}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5 mt-2">
                  <Label className="text-[10px]">{t("ডোজ নির্দেশনা ও নোটস", "Dosage Instructions & Notes")}</Label>
                  <textarea 
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={t("যেমন: খাবারের আগে, ভরা পেটে...", "e.g., Before meals, after breakfast...")}
                    value={(reminderConfig as any).notes || ''}
                    onChange={(e) => setReminderConfig(prev => ({ ...prev, notes: e.target.value } as any))}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">"""

content = content.replace(reminder_ui_old, reminder_ui_new)

# 3. Add Export ICS button in reminder list or footer
content = content.replace(
    '<Button className="w-full" onClick={handleSaveReminder}>',
    '<div className="flex gap-2 w-full">\n                  <Button variant="outline" className="flex-1" onClick={() => exportToICS(reminderConfig, configProduct)}>\n                    <Calendar className="mr-2 h-4 w-4" /> ICS Export\n                  </Button>\n                  <Button className="flex-1" onClick={handleSaveReminder}>'
)

# 4. Update Delivery Log Filters
log_filter_ui = """
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {['all', 'success', 'failed', 'pending'].map((f) => (
              <Button 
                key={f} 
                variant={logFilter === f ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-[10px] capitalize"
                onClick={() => setLogFilter(f)}
              >
                {t(f, f)}
              </Button>
            ))}
          </div>
"""

content = content.replace(
    '<ScrollArea className="h-[400px] pr-4">',
    log_filter_ui + '<ScrollArea className="h-[400px] pr-4">'
)

content = content.replace(
    '{notificationHistory.map((log: any) => (',
    '{notificationHistory.filter(l => logFilter === "all" || l.status === logFilter).map((log: any) => ('
)

with open(file_path, "w") as f:
    f.write(content)
