import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace MedSuggestion with MedWithReminder in key places
content = content.replace('MedSuggestion[]', 'MedWithReminder[]')
content = content.replace('MedSuggestion | null', 'MedWithReminder | null')
content = content.replace('as MedSuggestion[]', 'as MedWithReminder[]')
content = content.replace('MedSuggestion } | null', 'MedWithReminder } | null')

# Specifically for the items variable in checkReminderConflicts which uses items (calculated from items)
# The items variable is derived from favorites and recent
content = content.replace('const favorites = data?.favorites || [];', 'const favorites = (data?.favorites || []) as MedWithReminder[];')
content = content.replace('const recent = data?.recent || [];', 'const recent = (data?.recent || []) as MedWithReminder[];')

with open(file_path, "w") as f:
    f.write(content)
