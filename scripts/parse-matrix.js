const fs = require("fs");

const html = fs.readFileSync(
  "C:\\Users\\User\\.local\\share\\opencode\\tool-output\\tool_eb939465d001Hr9uHX4ZTrj0tO",
  "utf8",
);
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const WINNERS = ["A", "B", "D", "E", "G", "I", "K", "L"];

// Extract all rows from the table
// Each row: <tr><th>N</th><td>...</td>...<td>...3X...</td></tr>
const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];

const entries = [];

for (const row of rows) {
  // Skip header rows
  if (row.includes("<th") && !row.includes('scope="row"')) continue;
  if (!row.includes("3")) continue;

  // Extract cells
  const cells = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
  let match;
  while ((match = cellRegex.exec(row)) !== null) {
    cells.push(match[1].trim());
  }

  // cells[0] is row number (th), cells[1..12] are group cols, cells[13] is separator, cells[14..21] are matchups
  if (cells.length < 22) continue;

  // Check which group cells (1-12) have bold content (qualified)
  const qualified = [];
  for (let i = 1; i <= 12; i++) {
    if (cells[i] && (cells[i].startsWith("<b>") || cells[i].startsWith("<b"))) {
      qualified.push(GROUPS[i - 1]);
    }
  }

  if (qualified.length !== 8) continue;

  // Extract matchup values from cells[14] to cells[21]
  const matchupLetters = [];
  for (let i = 14; i < 22 && i < cells.length; i++) {
    const val = cells[i].replace(/3/g, "").trim();
    matchupLetters.push(val);
  }

  if (matchupLetters.length !== 8) continue;

  const key = qualified.join("");
  const val = matchupLetters.join("");
  entries.push({ key, val });
}

console.log(`// Auto-generated: ${entries.length} entries`);
for (const { key, val } of entries) {
  console.log(`  ["${key}", "${val}"],`);
}
