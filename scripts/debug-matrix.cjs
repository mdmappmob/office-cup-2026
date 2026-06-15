const fs = require("fs");

const html = fs.readFileSync(
  "C:\\Users\\User\\.local\\share\\opencode\\tool-output\\tool_eb939465d001Hr9uHX4ZTrj0tO",
  "utf8",
);
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
console.log("Total rows:", rows.length);

let found = 0;
for (let ri = 0; ri < Math.min(rows.length, 20); ri++) {
  const row = rows[ri];
  if (row.includes("<th") && !row.includes('scope="row"')) {
    console.log(`Row ${ri}: header, skipping`);
    continue;
  }
  if (!row.includes("3")) {
    console.log(`Row ${ri}: no 3, skipping`);
    continue;
  }

  const cells = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
  let match;
  while ((match = cellRegex.exec(row)) !== null) {
    cells.push(match[1].trim());
  }

  console.log(`Row ${ri}: ${cells.length} cells`);
  for (let i = 0; i < Math.min(cells.length, 25); i++) {
    console.log(`  cells[${i}]: "${cells[i].substring(0, 80)}"`);
  }
}
