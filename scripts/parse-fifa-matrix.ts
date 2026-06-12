// Script to parse Wikipedia matrix data into TypeScript
// Run: npx tsx scripts/parse-fifa-matrix.ts > src/lib/fifa-matrix-data.ts

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const WINNERS = ["A", "B", "D", "E", "G", "I", "K", "L"];

// Wikipedia wikitext rows extracted from the saved file
// Format: [which groups are qualified (the 12-col boolean), then the 8 matchups]
// The wikitext has columns in order A,B,C,D,E,F,G,H,I,J,K,L
// Bold '''X''' means qualified
// Then: || 3X || 3Y || ... for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L

const WIKITEXT = `| || || || || '''E''' || '''F''' || '''G''' || '''H''' || '''I''' || '''J''' || '''K''' || '''L''' || 3E || 3J || 3I || 3F || 3H || 3G || 3L || 3K`;

// But instead of parsing, let me use a different approach:
// I'll generate the matrix from the known pattern.
// The Wikipedia table is C(12,8) = 495 rows.
// Each row has: 8 qualified groups (sorted) → 8 matchups

// Actually, let me just hardcode all 495 entries from the known pattern.
// The pattern: entries are sorted such that the 4 non-qualified groups "roll through"
// in a specific combinatorial pattern.

// For a known row, the format is:
// key: 8 groups sorted alphabetically
// value: 8 matchups in [1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L] order

// Let me build it from the known Wikipedia page HTML instead.
// Fetch the page and parse the table.

async function main() {
  const resp = await fetch(
    "https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_knockout_stage&printable=yes"
  );
  const html = await resp.text();
  
  // Find the combinations table
  const tableMatch = html.match(/<table class="wikitable[^>]*>[\s\S]*?<\/table>/g);
  if (!tableMatch) {
    console.error("Table not found");
    return;
  }
  
  // The first big wikitable is the combinations table
  const tableHtml = tableMatch[0];
  
  // Parse rows
  const rowRegex = /<tr>[\s\S]*?<\/tr>/g;
  const rows = tableHtml.match(rowRegex);
  if (!rows) {
    console.error("Rows not found");
    return;
  }
  
  const entries: string[] = [];
  
  for (const row of rows) {
    // Skip header rows
    if (row.includes("<th")) continue;
    
    // Extract cells
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }
    
    if (cells.length < 20) continue;
    
    // First 12 cells: group columns (A-L)
    // Check which groups have bold content (qualified 3rd place)
    const qualified: string[] = [];
    for (let i = 0; i < 12; i++) {
      const cell = cells[i];
      // Check if it contains bold markers or just text
      const isBold = cell.includes("<b>") || cell.match(/^'''/) || 
        (cell.trim() !== "" && !cell.includes("&nbsp;") && !cell.match(/^(|\s*)$/));
      if (isBold && cell.trim() !== "" && !cell.includes("rowspan")) {
        qualified.push(GROUPS[i]);
      }
    }
    
    if (qualified.length !== 8) continue;
    
    // Cells 12-19: skip the separator/rowspan
    // Cells 20-27: the matchup values (3X)
    const matchups: string[] = [];
    for (let i = 20; i < 28 && i < cells.length; i++) {
      const m = cells[i].replace(/3/g, "").trim();
      matchups.push(m);
    }
    
    if (matchups.length !== 8) continue;
    
    const key = qualified.join("");
    const val = matchups.join("");
    entries.push(`  ["${key}", "${val}"]`);
  }
  
  if (entries.length === 0) {
    console.error("No entries parsed. Trying alt method...");
    // Fallback: try parsing differently
    console.log("Table HTML preview:", tableHtml.substring(0, 2000));
    return;
  }
  
  // Output as TypeScript
  console.log(`// Auto-generated from Wikipedia FIFA 2026 Annex C matrix`);
  console.log(`// ${entries.length} entries`);
  console.log(`export const FIFA_MATRIX = new Map<string, string>([`);
  console.log(entries.join(",\n"));
  console.log(`]);`);
}

main().catch(console.error);
