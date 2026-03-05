const fs = require("fs").promises;
const { exec } = require("child_process");
const { join } = require("path");

// Read kings_cross.tab
const kingsCrossData = fs
  .readFile("kings_cross.tab", "utf-8")
  .then((content) => {
    console.log("Loaded kings_cross.tab");

    // Parse the tab file into player objects
    const lines = content.split("\n").filter((line) => line.trim());
    const players = [];

    for (const line of lines) {
      if (line.startsWith("Group") || line.startsWith("Version")) continue;

      const cols = line.split("\t");
      if (cols[4]) {
        // Has rank
        players.push({
          rank: parseInt(cols[4]),
          group: cols[0] || "",
          lastName: cols[1] || "",
          firstName: cols[2] || "",
          rating: parseInt(cols[3]) || -1,
          nRating: 0,
          grade: cols[6] || "N/A",
          games: parseInt(cols[7]) || 0,
          attendance: parseInt(cols[8]) || 0,
          phone: cols[9] || "",
          info: cols[10] || "",
          school: cols[11] || "",
          room: cols[12] || "",
          gameResults: cols.slice(13, 44),
        });
      }
    }

    console.log(`Parsed ${players.length} players`);

    // Sort by rank
    players.sort((a, b) => a.rank - b.rank);

    // Assign new ranks after sorting
    players.forEach((p, i) => {
      p.rank = i + 1;
    });

    return JSON.stringify(players);
  })
  .then((playersJson) => {
    console.log("Creating helper script...");

    const scriptContent = `
const fs = require("fs").promises;

async function main() {
  const players = ${playersJson};
  
  // Wait for page to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Set localStorage with players data
  await page.evaluate((data) => {
    localStorage.setItem("ladder_players", JSON.stringify(data));
    console.log("Set localStorage with", data.length, "players");
  }, players);
  
  // Force reload to pick up localStorage data
  await page.reload();
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Export
  const buttons = Array.from(document.querySelectorAll("button"));
  const exportBtn = buttons.find(b => b.textContent && b.textContent.includes("Export"));
  if (exportBtn) {
    exportBtn.click();
    console.log("Clicked Export button");
  }
}

main();
`;

    fs.writeFile("scripts/load-kings-cross.js", scriptContent, "utf-8")
      .then(() => console.log("Created load-kings-cross.js"))
      .catch((err) => console.error("Error:", err));
  })
  .catch((err) => console.error("Error:", err));
