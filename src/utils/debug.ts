/**
 * Debug utility for conditional logging based on settings
 */

export function getDebugLevel(): number {
  try {
    const savedSettings = localStorage.getItem("ladder_settings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return parsed.debugLevel ?? 5;
    }
  } catch (err) {
    // Ignore errors, use default
  }
  return 5;
}

export function shouldLog(debugThreshold: number): boolean {
  return getDebugLevel() < debugThreshold;
}

export function debugLog(
  message: string,
  threshold: number = 10,
  ...args: any[]
): void {
  if (shouldLog(threshold)) {
    console.log(message, ...args);
  }
}
