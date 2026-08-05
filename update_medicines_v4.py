import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Enhanced Row Action State
content = content.replace(
    'const [selected, setSelected] = useState<Set<string>>(new Set());',
    'const [selected, setSelected] = useState<Set<string>>(new Set());\n  const [importRowActions, setImportRowActions] = useState<Set<number>>(new Set());'
)

# Individual Row Action UI in Preview
row_action_ui = """
                      <div className="flex items-center gap-1">
                        <Checkbox 
                          checked={importRowActions.has(row._row)} 
                          onCheckedChange={() => {
                            const next = new Set(importRowActions);
                            if (next.has(row._row)) next.delete(row._row);
                            else next.add(row._row);
                            setImportRowActions(next);
                          }}
                        />
                      </div>
"""

# Try to insert into the preview table rows
content = content.replace(
    '<TableCell className="text-[10px]">{row._row}</TableCell>',
    f'<TableCell className="text-[10px] flex items-center gap-2">{row_action_ui} {row._row}</TableCell>'
)

# Action button to apply only selected rows
apply_btn_old = '<Button size="sm" onClick={() => processImport(mappedData)}>'
apply_btn_new = '<Button size="sm" onClick={() => processImport(importRowActions.size > 0 ? mappedData.filter(d => importRowActions.has(d._row)) : mappedData)}>'

content = content.replace(apply_btn_old, apply_btn_new)

with open(file_path, "w") as f:
    f.write(content)
