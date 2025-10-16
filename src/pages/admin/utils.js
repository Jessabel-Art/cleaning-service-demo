export const MONEY0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function money(n) {
  return MONEY0.format(Number(n || 0));
}

export function rangePreset(preset) {
  const now = new Date();
  const from = new Date();
  const to = new Date();
  to.setHours(23,59,59,999);

  if (preset === "7d") from.setDate(now.getDate() - 6);
  else if (preset === "30d") from.setDate(now.getDate() - 29);
  else if (preset === "qtr") { // calendar quarter
    const qStartMonth = Math.floor(now.getMonth()/3)*3;
    from.setMonth(qStartMonth, 1); from.setHours(0,0,0,0);
  }
  else if (preset === "year") { from.setFullYear(now.getFullYear(), 0, 1); from.setHours(0,0,0,0); }
  else { from.setHours(0,0,0,0); } // today as default

  return { from, to };
}

export function csvDownload(filename, rows, header) {
  const headerLine = header.join(",");
  const lines = rows.map((r) => header.map((h) => {
    const v = String(r[h] ?? "").replaceAll('"','""').replaceAll("\n"," ");
    return `"${v}"`;
  }).join(","));
  const csv = [headerLine, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
