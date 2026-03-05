#!/usr/bin/env node

const { chromium } = require("@playwright/test");
const fs = require("fs").promises;
const { exec } = require("child_process");
const { join } = require("path");
const http = require("http");
const mime = require("mime-types");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeContent(content) {
  let normalized = content.replace(
    /Export_Results_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d+\.txt/g,
    "Export_Results_TIMESTAMP.txt",
  );
  normalized = normalized.replace(/\r\n/g, "\n");
  normalized = normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  return normalized;
}

function compareFiles(expected, actual) {
  const expectedNormalized = normalizeContent(expected);
  const actualNormalized = normalizeContent(actual);
  if (expectedNormalized === actualNormalized) {
    return { match: true, diff: "" };
  }
  const expectedLines = expectedNormalized.split("\n");
  const actualLines = actualNormalized.split("\n");
  const maxLines = Math.max(expectedLines.length, actualLines.length);
  let diff = "";
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] || "";
    const actualLine = actualLines[i] || "";
    if (expectedLine !== actualLine) {
      diff += `Line ${i + 1}:\n`;
      diff += `  Expected: "${expectedLine}"\n`;
      diff += `  Actual:   "${actualLine}"\n`;
    }
  }
  return { match: false, diff };
}

async function startServer(port, distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = require("url");
        const path = require("path");
        const parsedUrl = url.parse(req.url);
        let filePath = path.join(
          distDir,
          parsedUrl.pathname === "/" ? "index.html" : parsedUrl.pathname,
        );
        let stats = await fs.stat(filePath).catch(() => null);
        if (!stats && !filePath.includes(".")) {
          filePath = path.join(distDir, "index.html");
          stats = await fs.stat(filePath).catch(() => null);
        }
        if (!stats) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const content = await fs.readFile(filePath);
        const mimeType = mime.contentType(filePath) || "text/plain";
        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
      } catch (err) {
        res.writeHead(500);
        res.end("Internal server error");
      }
    });
    server
      .listen(port, "127.0.0.1", () => {
        console.log(`Server started on port ${port}`);
        resolve(server);
      })
      .on("error", reject);
  });
}

async function runTest(config, rebuildApp = false) {
  console.log("\n========================================");
  console.log(`Running test: ${config.name}`);
  console.log("========================================\n");

  if (rebuildApp) {
    console.log("Rebuilding app...");
    await new Promise((resolve, reject) => {
      exec("npm run build", (error) => {
        if (error) {
          console.error("Build failed:", error);
          reject(error);
          return;
        }
        console.log("Build completed successfully");
        resolve();
      });
    });
  }

  console.log("Starting HTTP server...");
  const server = await startServer(5173, "dist");
  console.log("Server is ready");

  let browser;
  let outputContent = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    const downloadsPath = join(__dirname, "test-downloads");
    await fs.mkdir(downloadsPath, { recursive: true });

    const page = await context.newPage();

    page.on("download", async (download) => {
      const suggestedName = await download.suggestedFilename();
      console.log(`Download detected: ${suggestedName}`);
      try {
        const filePath = join(downloadsPath, suggestedName);
        await download.saveAs(filePath);
        outputContent = await fs.readFile(filePath, "utf-8");
        console.log(`Download saved to: ${filePath}`);
      } catch (err) {
        console.error("Failed to save download:", err);
      }
    });

    console.log("Loading app...");
    await page.goto("http://localhost:5173", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    await page.evaluate(() => {
      localStorage.clear();
    });

    console.log(`Loading input file: ${config.inputFilePath}`);

    const loadClicked = await page.evaluate(() => {
      const labels = document.querySelectorAll("label");
      for (const label of labels) {
        if (label.textContent && label.textContent.includes("Load")) {
          label.click();
          return true;
        }
      }
      return false;
    });

    await sleep(500);

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(config.inputFilePath);
      console.log(`File selected: ${config.inputFilePath}`);
    }

    await sleep(3000);

    const playerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll("tbody tr");
      return rows.length;
    });
    console.log(`Player count after load: ${playerCount}`);

    const firstPlayer = await page.evaluate(() => {
      const rows = document.querySelectorAll("tbody tr");
      if (rows.length > 0) {
        const cells = rows[0].querySelectorAll("td");
        if (cells.length >= 4) {
          return `${cells[2]?.textContent || ""} ${cells[3]?.textContent || ""}`;
        }
      }
      return "unknown";
    });
    console.log(`First player: ${firstPlayer}`);

    if (playerCount > 14 || !firstPlayer.includes("Garcia")) {
      console.log(`Successfully loaded ${playerCount} players`);
    } else {
      console.log("Warning: Sample data loaded instead of input file");
    }

    // Handle actions array
    if (config.actions && config.actions.length > 0) {
      console.log(
        "Executing actions:",
        config.actions.map((a) => a.type).join(", "),
      );

      for (const action of config.actions) {
        if (action.type === "openSettings") {
          console.log("Opening settings...");
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const settingsBtn = buttons.find(
              (b) => b.textContent && b.textContent.includes("Settings"),
            );
            if (settingsBtn) settingsBtn.click();
          });
          await sleep(1500);
        }

        if (action.type === "clearAllData") {
          console.log("Clearing all data...");
          await sleep(1000);
          const clearButton = await page.$('button:has-text("Clear All Data")');
          if (clearButton) {
            await clearButton.click();
            console.log("Clicked Clear All Data button");
            await sleep(2000);

            const okButton = await page.$('button:has-text("OK")');
            if (okButton) {
              await okButton.click();
              console.log("Clicked OK on confirmation dialog");
              await sleep(2000);
            }
          }
        }

        if (action.type === "recalculateRatings") {
          console.log("Clicking Recalculate Ratings...");
          await sleep(2000);
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const target = buttons.find(
              (b) =>
                b.textContent && b.textContent.includes("Recalculate Ratings"),
            );
            if (target) target.click();
          });
          await sleep(3000);
        }

        if (action.type === "clearCell") {
          console.log("Clearing cell...");
          await sleep(1500);
          const clearButton = await page.$('button:has-text("Clear Cell")');
          if (clearButton) {
            await clearButton.click();
            console.log("Clicked Clear Cell button");
            await sleep(1500);
          }
        }

        if (action.type === "cancelDialog") {
          console.log("Cancelling dialog...");
          await sleep(1500);
          const cancelButton = await page.$('button:has-text("Cancel")');
          if (cancelButton) {
            await cancelButton.click();
            console.log("Clicked Cancel button");
            await sleep(1500);
          }
        }

        if (action.type === "fillGameResult") {
          console.log(
            `Filling game result: player ${action.playerRank}, round ${action.round} = "${action.resultString}"`,
          );

          await page.evaluate(
            async ({ playerRank, round }) => {
              const rows = Array.from(document.querySelectorAll("tbody tr"));
              const targetRow = rows[playerRank - 1];
              if (!targetRow) return;

              const gameCell = targetRow.children[6 + round];
              if (!gameCell) return;

              gameCell.click();
            },
            { playerRank: action.playerRank, round: action.round },
          );

          await sleep(3000);

          await page.evaluate(
            async ({ resultString }) => {
              const inputField = document.getElementById("correctedResult");
              if (inputField) {
                inputField.value = resultString;
                inputField.dispatchEvent(new Event("input", { bubbles: true }));

                const buttons = Array.from(document.querySelectorAll("button"));
                const saveButton = buttons.find(
                  (b) => b.textContent && b.textContent.includes("Save"),
                );
                if (saveButton) saveButton.click();
              }
            },
            { resultString: action.resultString },
          );

          await sleep(2000);
        }
      }
    }

    if (config.clickExportButton) {
      console.log("Clicking Export button...");
      const exportClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const target = buttons.find(
          (b) => b.textContent && b.textContent.includes("Export"),
        );
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (!exportClicked) {
        console.log("Warning: Could not find Export button");
      }
      await sleep(5000);
    }

    if (config.quitAfterExport && outputContent) {
      console.log("quitAfterExport enabled - skipping comparison");
      await browser.close();
      await server.close();
      return true;
    }

    const buttonsToClick = config.buttonsToClick || [];
    console.log("Clicking buttons:", buttonsToClick.join(", ") || "none");

    for (const btnText of buttonsToClick) {
      console.log(`Searching for button: "${btnText}"`);
      let clicked = false;

      try {
        const button = await page.getByText(btnText, { exact: false });
        if (button) {
          console.log(`Found and clicking "${btnText}" via getByText`);
          try {
            await button.click();
            clicked = true;
          } catch (clickError) {
            await page.evaluate((text) => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const target = buttons.find(
                (b) => b.textContent && b.textContent.includes(text),
              );
              if (target) target.click();
            }, btnText);
            clicked = true;
          }
        }
      } catch (e) {
        console.log(`getByText failed for "${btnText}", trying evaluate`);
        const found = await page.evaluate((text) => {
          const buttons = Array.from(document.querySelectorAll("button"));
          return buttons.find(
            (b) => b.textContent && b.textContent.includes(text),
          );
        }, btnText);
        if (found) {
          await page.evaluate((text) => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const target = buttons.find(
              (b) => b.textContent && b.textContent.includes(text),
            );
            if (target) target.click();
          }, btnText);
          clicked = true;
        }
      }

      if (!clicked) {
        console.log(`Warning: Could not click button "${btnText}"`);
      } else {
        console.log(`Successfully clicked "${btnText}"`);
      }
      await sleep(2000);
    }

    await sleep(5000);

    if (!outputContent) {
      const files = await fs.readdir(downloadsPath);
      const txtFiles = files.filter((f) => f.endsWith(".txt"));
      if (txtFiles.length > 0) {
        console.log(`Found ${txtFiles.length} downloaded file(s):`, txtFiles);
        outputContent = await fs.readFile(
          join(downloadsPath, txtFiles[0]),
          "utf-8",
        );
      } else {
        console.error("No output file was generated!");
        return false;
      }
    }

    console.log("\nComparing output...");
    const expectedContent = await fs.readFile(
      config.expectedOutputFile,
      "utf-8",
    );
    const comparison = compareFiles(expectedContent, outputContent);

    if (comparison.match) {
      console.log("Test PASSED - Output matches expected file!");
      return true;
    } else {
      console.log("Test FAILED - Output does not match");
      console.log("\n--- Diff ---");
      console.log(comparison.diff);
      console.log("--- End diff ---\n");
      return false;
    }
  } catch (error) {
    console.error("Test error:", error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
    try {
      await server.close();
    } catch (e) {}
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npm run test:automation -- [--config <config-file>]");
    process.exit(1);
  }

  let configPath = "";
  let rebuild = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === "--rebuild") {
      rebuild = true;
    }
  }

  if (!configPath) {
    console.log("Error: No config file specified");
    process.exit(1);
  }

  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));

    console.log("\n=== Running test ===");
    const success = await runTest(config, rebuild);

    if (success) {
      console.log("Test completed successfully!");
      process.exit(0);
    } else {
      console.log("\nTest failed.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
