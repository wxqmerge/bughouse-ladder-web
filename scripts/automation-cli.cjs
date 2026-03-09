#!/usr/bin/env node

const { chromium } = require("@playwright/test");
const fs = require("fs").promises;
const { exec } = require("child_process");
const { join, resolve } = require("path");
const http = require("http");
const mime = require("mime-types");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeContent(content) {
  let normalized = content.replace(
    /Export_Results_\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d+\.tab/g,
    "Export_Results_TIMESTAMP.tab",
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

async function startServer(port, distDir, logLine) {
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
        logLine(`Server started on port ${port}`);
        resolve(server);
      })
      .on("error", reject);
  });
}

let logStream = "";

async function runTest(config, rebuildApp = false, logFile = null) {
  logStream = `=== Test: ${config.name} ===\n\n`;

  const logLine = (msg) => {
    console.log(msg);
    if (logFile) logStream += msg + "\n";
  };

  let testOutputContent = null; // Track output content for potential update

  logLine("\n========================================");
  logLine(`-- Running test: ${config.name}`);
  logLine("========================================\n");

  if (rebuildApp) {
    logLine("-- Rebuilding app...");
    await new Promise((resolve, reject) => {
      exec("npm run build", (error) => {
        if (error) {
          logLine(`Build failed: ${error}`);
          reject(error);
          return;
        }
        logLine("-- Build completed successfully");
        resolve();
      });
    });
  }

  logLine("-- Starting HTTP server...");
  const server = await startServer(5173, "dist", logLine);
  logLine("-- Server is ready");

  let browser;
  let outputContent = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    const downloadsPath = join(__dirname, "test-downloads");
    await fs.mkdir(downloadsPath, { recursive: true });

    const page = await context.newPage();

    // Handle confirm dialogs (e.g., Clear All Data confirmation)
    page.on("dialog", async (dialog) => {
      logLine(`-- Dialog: ${dialog.message()}`);
      await dialog.accept();
    });

    // Capture console.log from browser
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      logLine(`>>> [${type.toUpperCase()}] ${text}`);
    });

    page.on("download", async (download) => {
      const suggestedName = await download.suggestedFilename();
      logLine(`-- Download detected: ${suggestedName}`);
      try {
        const filePath = join(downloadsPath, suggestedName);
        await download.saveAs(filePath);
        outputContent = await fs.readFile(filePath, "utf-8");
        testOutputContent = outputContent; // Save for potential update
        logLine(`-- Download saved to: ${filePath}`);
      } catch (err) {
        logLine(`Failed to save download: ${err.message}`);
      }
    });

    logLine("-- Loading app...");
    await page.goto("http://localhost:5173", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(2000);

    await page.evaluate(() => {
      localStorage.clear();
    });

    // Log default debug level after clearing localStorage
    const defaultDebugLevel = await page.evaluate(() => {
      try {
        const savedSettings = localStorage.getItem("ladder_settings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          return parsed.debugLevel ?? 5;
        }
      } catch (err) {}
      return 5;
    });
    logLine(`-- Default debug level: ${defaultDebugLevel}`);

    logLine(`-- Loading input file: ${config.inputFilePath}`);

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
      logLine(`-- File selected: ${config.inputFilePath}`);
    }

    await sleep(3000);

    const playerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll("tbody tr");
      return rows.length;
    });
    logLine(`-- Player count after load: ${playerCount}`);

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
    logLine(`-- First player: ${firstPlayer}`);

    if (playerCount > 14 || !firstPlayer.includes("Garcia")) {
      logLine(`-- Successfully loaded ${playerCount} players`);
    } else {
      logLine("-- Warning: Sample data loaded instead of input file");
    }

    // Handle actions array
    if (config.actions && config.actions.length > 0) {
      logLine(
        `-- Executing actions: ${config.actions.map((a) => a.type).join(", ")}`,
      );

      for (const action of config.actions) {
        if (action.type === "openSettings") {
          logLine("-- Opening settings...");
          const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const settingsBtn = buttons.find(
              (b) => b.textContent && b.textContent.includes("Settings"),
            );
            if (settingsBtn) {
              settingsBtn.click();
              return true;
            }
            return false;
          });
          if (clicked) logLine(`-- Button pressed: Settings`);
          await sleep(1500);
        }

        if (action.type === "clearAllData") {
          logLine("-- Clearing all data...");
          await sleep(1000);
          const clearButton = await page.$('button:has-text("Clear All Data")');
          if (clearButton) {
            await clearButton.click();
            logLine(`-- Button pressed: Clear All Data`);
            await sleep(2000);

            // Wait for page reload triggered by window.location.reload()
            logLine("-- Waiting for page reload...");
            await page.waitForLoadState("networkidle", { timeout: 10000 });
            await sleep(3000);

            const playerCountAfter = await page.evaluate(() => {
              const rows = document.querySelectorAll("tbody tr");
              return rows.length;
            });
            logLine(`-- Player count after reload: ${playerCountAfter}`);
          }
        }

        if (action.type === "recalculateRatings") {
          logLine("-- Clicking Recalculate Ratings...");
          await sleep(2000);
          const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const target = buttons.find(
              (b) =>
                b.textContent && b.textContent.includes("Recalculate Ratings"),
            );
            if (target) {
              target.click();
              return true;
            }
            return false;
          });
          if (clicked) logLine(`-- Button pressed: Recalculate Ratings`);
          await sleep(3000);
        }

        if (action.type === "fillCorrection") {
          logLine(`-- Filling correction: "${action.correctionValue}"`);
          await sleep(1500);

          // Fill the input box only
          const filled = await page.evaluate(
            async ({ value }) => {
              const inputField = document.getElementById("correctedResult");
              if (inputField) {
                inputField.value = value;
                inputField.dispatchEvent(new Event("input", { bubbles: true }));
                return true;
              }
              return false;
            },
            { value: action.correctionValue },
          );

          if (filled) logLine(`-- Text entered: ${action.correctionValue}`);
          await sleep(1000);
        }

        if (action.type === "submitCorrection") {
          logLine("-- Submitting correction...");
          await sleep(1500);

          // Click Submit Correction or Save button (depending on dialog mode)
          const submitButton = await page.$(
            'button:has-text("Submit Correction"), button:has-text("Save")',
          );
          if (submitButton) {
            await submitButton.click();
            logLine(`-- Button pressed: Submit Correction/Save`);
            await sleep(2000);
          } else {
            logLine(
              "-- Warning: Could not find Submit Correction or Save button",
            );
          }
        }

        if (action.type === "clearCell") {
          logLine("-- Clearing cell...");
          await sleep(1500);
          const clearButton = await page.$('button:has-text("Clear Cell")');
          if (clearButton) {
            await clearButton.click();
            logLine(`-- Button pressed: Clear Cell`);
            await sleep(1500);
          }
        }

        if (action.type === "cancelDialog") {
          logLine("-- Cancelling dialog...");
          await sleep(1500);
          const cancelButton = await page.$('button:has-text("Cancel")');
          if (cancelButton) {
            await cancelButton.click();
            logLine(`-- Button pressed: Cancel`);
            await sleep(1500);
          }
        }

        if (action.type === "pasteResults") {
          // Parse tab-delimited results into array
          const results = action.results
            .split("\t")
            .filter((r) => r.trim() !== "");
          logLine(`-- Pasting ${results.length} tab-delimited results`);

          // Log all results for debug output
          results.forEach((result, idx) => {
            logLine(`>>> [RESULT] ${idx + 1}: "${result}"`);
          });

          // Fill each result into separate empty cells
          let filledCount = 0;
          for (const result of results) {
            const placed = await page.evaluate((resultValue) => {
              const rows = Array.from(document.querySelectorAll("tbody tr"));
              const maxRounds = 31;

              // Find first empty cell
              for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                const row = rows[rowIdx];
                for (let round = 0; round < maxRounds; round++) {
                  const cell = row.children[6 + round];
                  if (cell && cell.textContent.trim() === "") {
                    cell.click();
                    return { found: true, rowIdx, round };
                  }
                }
              }
              return { found: false };
            });

            if (placed.found) {
              await sleep(500);

              // Fill input and click Save
              const saved = await page.evaluate((resultValue) => {
                const inputField = document.getElementById("correctedResult");
                if (inputField) {
                  inputField.value = resultValue;
                  inputField.dispatchEvent(
                    new Event("input", { bubbles: true }),
                  );

                  const buttons = Array.from(
                    document.querySelectorAll("button"),
                  );
                  const saveButton = buttons.find(
                    (b) => b.textContent && b.textContent.includes("Save"),
                  );
                  if (saveButton) {
                    saveButton.click();
                    return true;
                  }
                }
                return false;
              }, result);

              if (saved) {
                filledCount++;
                logLine(`-- Filled cell ${filledCount} with: "${result}"`);
              }
            }
            await sleep(1000);
          }

          logLine(`-- Pasted ${filledCount} of ${results.length} results`);
        }

        if (action.type === "fillGameResult") {
          logLine(
            `-- Filling game result: player ${action.playerRank}, round ${action.round} = "${action.resultString}"`,
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
      logLine("-- Clicking Export button...");
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
      if (exportClicked) {
        logLine(`-- Button pressed: Export`);
      } else {
        logLine("-- Warning: Could not find Export button");
      }
      await sleep(5000);
    }

    const buttonsToClick = config.buttonsToClick || [];
    logLine(`-- Clicking buttons: ${buttonsToClick.join(", ") || "none"}`);

    for (const btnText of buttonsToClick) {
      logLine(`-- Searching for button: "${btnText}"`);
      let clicked = false;

      try {
        const button = await page.getByText(btnText, { exact: false });
        if (button) {
          logLine(`-- Found and clicking "${btnText}" via getByText`);
          try {
            await button.click();
            logLine(`-- Button pressed: ${btnText}`);
            clicked = true;
          } catch (clickError) {
            const fallbackClicked = await page.evaluate((text) => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const target = buttons.find(
                (b) => b.textContent && b.textContent.includes(text),
              );
              if (target) {
                target.click();
                return true;
              }
              return false;
            }, btnText);
            if (fallbackClicked) {
              logLine(`-- Button pressed: ${btnText}`);
            }
            clicked = fallbackClicked;
          }
        }
      } catch (e) {
        logLine(`-- getByText failed for "${btnText}", trying evaluate`);
        const found = await page.evaluate((text) => {
          const buttons = Array.from(document.querySelectorAll("button"));
          return buttons.find(
            (b) => b.textContent && b.textContent.includes(text),
          );
        }, btnText);
        if (found) {
          const fallbackClicked = await page.evaluate((text) => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const target = buttons.find(
              (b) => b.textContent && b.textContent.includes(text),
            );
            if (target) {
              target.click();
              return true;
            }
            return false;
          }, btnText);
          if (fallbackClicked) {
            logLine(`-- Button pressed: ${btnText}`);
          }
          clicked = fallbackClicked;
        }
      }

      if (!clicked) {
        logLine(`-- Warning: Could not click button "${btnText}"`);
      } else {
        logLine(`-- Successfully clicked "${btnText}"`);
      }
      await sleep(2000);
    }

    await sleep(5000);

    if (!outputContent) {
      const files = await fs.readdir(downloadsPath);
      const txtFiles = files.filter((f) => f.endsWith(".tab"));
      if (txtFiles.length > 0) {
        logLine(`-- Found ${txtFiles.length} downloaded file(s):`, txtFiles);
        outputContent = await fs.readFile(
          join(downloadsPath, txtFiles[0]),
          "utf-8",
        );
      } else {
        logLine("-- No output file was generated!");
        return false;
      }
    }

    // Log full path to expected file for debugging
    const expectedFullPath = resolve(config.expectedOutputFile);
    logLine(`-- Expected file: ${expectedFullPath}`);

    logLine("\n-- Comparing output...");
    const expectedContent = await fs.readFile(
      config.expectedOutputFile,
      "utf-8",
    );
    const comparison = compareFiles(expectedContent, outputContent);

    if (comparison.match) {
      logLine("-- Test PASSED - Output matches expected file!");
      return { success: true, outputContent: testOutputContent };
    } else {
      logLine("-- Test FAILED - Output does not match");
      logLine("\n--- Diff ---");
      logLine(comparison.diff);
      logLine("--- End diff ---\n");
      return { success: false, outputContent: testOutputContent };
    }
  } catch (error) {
    logLine(`-- Test error: ${error.message}`);
    return { success: false, outputContent: null };
  } finally {
    if (browser) {
      await browser.close();
    }
    try {
      await server.close();
    } catch (e) {}
    // Write log to file if provided
    if (logFile) {
      await fs.writeFile(logFile, logStream, "utf-8");
      console.log(`\nLog saved to: ${logFile}\n`);
    }
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
  let updateExpected = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === "--rebuild") {
      rebuild = true;
    } else if (args[i] === "--update-expected") {
      updateExpected = true;
    }
  }

  if (!configPath) {
    console.log("Error: No config file specified");
    process.exit(1);
  }

  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));

    // Check if this is a test_all config (contains array of tests)
    if (config.tests && Array.isArray(config.tests)) {
      console.log("\n=== Running ALL TESTS ===");
      console.log(`Found ${config.tests.length} tests to run`);

      let allPassed = true;
      let passedCount = 0;
      let failedCount = 0;
      const failedTests = []; // Track failed tests with their expected output files

      for (let i = 0; i < config.tests.length; i++) {
        const testConfig = config.tests[i];
        console.log(`\n\n========================================`);
        console.log(
          `Test ${i + 1}/${config.tests.length}: ${testConfig.config}`,
        );
        console.log("========================================\n");

        // Read individual test config (use absolute path)
        const fullPath = resolve(testConfig.config);
        const individualConfig = JSON.parse(
          await fs.readFile(fullPath, "utf-8"),
        );

        // Generate log file for this test
        const configFileName = testConfig.config.split(/[\\/]/).pop();
        const baseName = configFileName.replace(/\.json$/i, "");
        const testLogFile = `test-cases/${baseName}.log`;

        const result = await runTest(individualConfig, rebuild, testLogFile);
        const success = result.success;

        if (success) {
          passedCount++;
          console.log(`\n[PASS] Test ${i + 1}`);
        } else {
          allPassed = false;
          failedCount++;
          console.log(`\n[FAIL] Test ${i + 1}`);
          // Track failed test with expected output file and actual output content
          if (individualConfig.expectedOutputFile) {
            failedTests.push({
              testName: baseName,
              expectedOutputFile: individualConfig.expectedOutputFile,
              actualOutput: result.outputContent,
            });
          }
        }
      }

      console.log("\n\n========================================");
      console.log("ALL TESTS COMPLETE");
      console.log("========================================");
      console.log(`Passed: ${passedCount}/${config.tests.length}`);
      console.log(`Failed: ${failedCount}/${config.tests.length}`);

      if (allPassed) {
        console.log("\nAll tests passed!");
        process.exit(0);
      } else {
        // Show failed tests and ask if user wants to update expected outputs
        console.log("\n\nFailed tests:");
        failedTests.forEach((test, idx) => {
          console.log(
            `  ${idx + 1}. ${test.testName}: ${test.expectedOutputFile}`,
          );
        });

        // If --update-expected flag was passed, update automatically
        if (updateExpected) {
          console.log(
            "\n\n-- Updating expected output files with test outputs...",
          );
          for (const test of failedTests) {
            try {
              if (test.actualOutput) {
                const normalizedContent = normalizeContent(test.actualOutput);
                await fs.writeFile(
                  test.expectedOutputFile,
                  normalizedContent,
                  "utf-8",
                );
                console.log(`  Updated: ${test.expectedOutputFile}`);
              } else {
                console.log(
                  `  Skipped ${test.expectedOutputFile} (no output content available)`,
                );
              }
            } catch (err) {
              console.log(
                `  Error updating ${test.expectedOutputFile}: ${err.message}`,
              );
            }
          }
          console.log("\nExpected output files updated!");
        } else {
          // Interactive prompt for manual update
          const readline = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          readline.question(
            "\nDo you want to update expected output files with test outputs? (y/n): ",
            async (answer) => {
              readline.close();

              if (
                answer.toLowerCase() === "y" ||
                answer.toLowerCase() === "yes"
              ) {
                console.log(
                  "\n\n-- Updating expected output files with test outputs...",
                );
                for (const test of failedTests) {
                  try {
                    if (test.actualOutput) {
                      const normalizedContent = normalizeContent(
                        test.actualOutput,
                      );
                      await fs.writeFile(
                        test.expectedOutputFile,
                        normalizedContent,
                        "utf-8",
                      );
                      console.log(`  Updated: ${test.expectedOutputFile}`);
                    } else {
                      console.log(
                        `  Skipped ${test.expectedOutputFile} (no output content available)`,
                      );
                    }
                  } catch (err) {
                    console.log(
                      `  Error updating ${test.expectedOutputFile}: ${err.message}`,
                    );
                  }
                }
                console.log("\nExpected output files updated!");
              } else {
                console.log("\nSkipping expected output file updates.");
              }

              process.exit(1);
            },
          );
          return; // Don't exit yet, wait for user input
        }
      }
    }

    // Single test mode
    const configFileName = configPath.split(/[\\/]/).pop();
    const baseName = configFileName.replace(/\.json$/i, "");
    const logFile = `test-cases/${baseName}.log`;

    console.log("\n=== Running test ===");
    const result = await runTest(config, rebuild, logFile);

    if (result.success) {
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
