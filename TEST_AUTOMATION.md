# Test Automation Framework

This framework allows you to automate testing of the Bughouse Chess Ladder application using headless browser automation. It's designed for debugging by letting you iteratively fix code until the output matches expected results.

## Quick Start

1. **Create a test case configuration file** in `test-cases/` directory:

```json
{
  "name": "My Test Case",
  "inputFilePath": "path/to/input.tab",
  "expectedOutputFile": "path/to/expected.txt",
  "buttonsToClick": ["Run tests"]
}
```

2. **Generate expected output**:
   - Run the app manually or use the automation to generate output
   - Save the generated output as your expected file
3. **Run automated test**:

   ```bash
   npm run test:automation -- --config test-cases/01-kings-cross.json
   ```

4. **Auto-retry mode** (for iterative debugging):
   ```bash
   npm run test:automation:watch -- --config test-cases/01-kings-cross.json
   ```

## How It Works

The automation tool:

1. Builds the application
2. Starts a local HTTP server
3. Launches a headless Chromium browser
4. Loads your input `.tab` file
5. Clicks the specified buttons (default: "Run tests")
6. Captures the exported results file
7. Compares output against expected file (with timestamp normalization)
8. Reports success/failure with detailed diff

If tests fail, it will:

- Show you what's different
- Wait 5 seconds for you to make code changes
- Rebuild and re-run automatically
- Repeat up to 10 times

## Configuration Options

### Required Fields

- `name`: Display name for the test case
- `inputFilePath`: Path to input `.tab` file (relative to project root)
- `expectedOutputFile`: Path to expected output `.txt` file (relative to project root)

### Optional Fields

- `buttonsToClick`: Array of button text to click in sequence. If not specified, defaults to clicking "Run tests" only.

Example with multiple buttons:

```json
{
  "name": "Custom Workflow",
  "inputFilePath": "test.tab",
  "expectedOutputFile": "expected.txt",
  "buttonsToClick": ["Load", "Sort by Rank", "Recalculate Ratings"]
}
```

## Normalization

The comparison normalizes the following:

- Timestamps in export filenames (`Export_Results_TIMESTAMP.txt`)
- Line endings (Windows CRLF → Unix LF)
- Trailing whitespace on each line

This allows you to generate expected output once and reuse it across runs.

## CLI Options

- `--config <file>`: Path to test case configuration file (required)
- `--rebuild`: Force rebuild before running (useful for watch mode)

## Example Workflow

```bash
# Run a specific test case
npm run test:automation -- --config test-cases/01-kings-cross.json

# Watch mode - keeps retrying after failures
npm run test:automation:watch -- --config test-cases/01-kings-cross.json

# After making code changes, just wait for auto-retry or press Ctrl+C to exit
```

## Test Case Template

Copy this template to create new test cases:

```json
{
  "name": "Test Case Name",
  "inputFilePath": "your-input-file.tab",
  "expectedOutputFile": "expected-output.txt"
}
```

## Troubleshooting

- **Port 5173 already in use**: The test uses port 5173. Close any other instances of the dev server first.
- **Download not captured**: Ensure the app is generating a downloadable file (not just console output).
- **Timeout errors**: Increase wait times in `scripts/automation-cli.js` if your input files are large.

## Files

- `scripts/automation-cli.cjs`: Main automation script
- `test-cases/`: Directory for test case configurations
- `test-downloads/`: Temporary directory for downloaded files (auto-created)
