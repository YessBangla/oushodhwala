import re

file_path = "src/routes/account.medicines.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Row action checkbox UI (escaped for string replacement)
row_action_ui = """
                        <TableCell className="text-[10px] flex items-center gap-2">
                          <Checkbox 
                            checked={importRowActions.has(row._row)} 
                            onCheckedChange={() => {
                              const next = new Set(importRowActions);
                              if (next.has(row._row)) next.delete(row._row);
                              else next.add(row._row);
                              setImportRowActions(next);
                            }}
                          />
                          {row._row}
                        </TableCell>
"""

# Replace the specific table cell line
content = content.replace('<TableCell className="text-[10px]">{row._row}</TableCell>', row_action_ui)

# Action button logic for applying selected rows
content = content.replace(
    '<Button size="sm" onClick={() => processImport(mappedData)}>',
    '<Button size="sm" onClick={() => processImport(importRowActions.size > 0 ? mappedData.filter((_, i) => importRowActions.has(i + 1)) : mappedData)}>'
)

with open(file_path, "w") as f:
    f.write(content)
