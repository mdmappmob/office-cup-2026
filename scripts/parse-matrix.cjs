const fs = require("fs");
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const html = fs.readFileSync(
  "C:\\Users\\User\\.local\\share\\opencode\\tool-output\\tool_eb939465d001Hr9uHX4ZTrj0tO",
  "utf8",
);
const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];

const entries = [];

for (const row of rows) {
  if (row.includes("<th") && !row.includes('scope="row"')) continue;
  if (!row.includes("3")) continue;

  const cells = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
  let m;
  while ((m = cellRegex.exec(row)) !== null) cells.push(m[1].trim());

  if (cells.length < 21) continue;

  // cells[0] = row number
  // cells[1..12] = groups A-L
  // cells[13..] = matchups (14..21 for row 1 with separator, or 13..20 for rest)
  const hasSep = cells.length === 22;
  const off = hasSep ? 14 : 13;

  // Collect qualified groups (A-L from cells[1..12])
  const qualified = [];
  for (let i = 1; i <= 12; i++) {
    if (cells[i] && cells[i].startsWith("<b>")) qualified.push(GROUPS[i - 1]);
  }
  if (qualified.length !== 8) continue;

  // Collect matchups
  const matchupCells = cells.slice(off, off + 8);
  if (matchupCells.length !== 8) continue;
  const matchups = matchupCells.map((c) => c.replace(/3/g, "").trim());

  const key = qualified.join("");
  const val = matchups.join("");
  entries.push({ key, val });
}

console.log(`// Matrix: ${entries.length} entries`);
for (const { key, val } of entries) {
  console.log(`["${key}","${val}"],`);
}
