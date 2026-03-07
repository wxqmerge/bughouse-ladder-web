/**
 * VB6 Bughouse Ladder - Types declarations
 */

import { shouldLog } from "./debug";

/**
 * VB6 Line: 25 - Global constants from common.bas
 * Field indices used throughout the VB6 application
 */
export const CONSTANTS = {
  GROWS_MAX: 200,
  GCOLS: 44,
  GROUP_FIELD: 0,
  LAST_NAME_FIELD: 1,
  FIRST_NAME_FIELD: 2,
  RATING_FIELD: 3,
  RANKING_FIELD: 4,
  N_RATING_FIELD: 5,
  GRADE_FIELD: 6,
  GAMES_FIELD: 7,
  ATTENDANCE_FIELD: 8,
  PHONE_FIELD: 9,
  INFO_FIELD: 10,
  SCHOOL_FIELD: 11,
  ROOM_FIELD: 12,
  LAST_PARAM_FIELD: 12,
} as const;

/**
 * VB6 Line: 90 - Result string parsing symbols
 * Used for parsing game results from strings
 */
export const RESULT_STRING = "OLDWXYZ__________" as const;

export interface PlayerData {
  rank: number;
  group: string;
  lastName: string;
  firstName: string;
  rating: number;
  nRating: number;
  grade: string;
  games: number;
  attendance: number | string;
  info: string;
  phone: string;
  school: string;
  room: string;
  gameResults: (string | null)[];
}

export type PlayersArray = Record<number, PlayerData>;

export type GamesData = Record<string, number[]>;

/**
 * VB6 Line: 24 - Group codes for player classification
 */
export const GROUP_CODES = "A1xAxBxCxDxExFxGxHxIxZx   " as const;

/**
 * VB6 Line: 91 - Global players array for game entry parsing
 * Used by parse_entry function
 */
export let players = [0, 0, 0, 0, 0, 0];

export const gameScores = [0, 0, 0];
export const gameQuickEntry = 0;

/**
 * VB6 Line: 82-83 - Global playerOrRow for type tracking
 */
export let playerOrRow = true;

/**
 * VB6 Line: 84-88 - Sort options
 */
export const SORT_OPTIONS = {
  SORT_RANK: 0,
  SORT_NAME: 1,
  SORT_FIRST_NAME: 2,
  SORT_RATING: 3,
} as const;

export const sortOptions = SORT_OPTIONS;

/**
 * VB6 Line: 129-130 - Elo rating formula
 * Returns probability of winning for given ratings
 */
export function formula(myRating: number, opponentsRating: number): number {
  return (
    1 / (1 + 10 ** ((Math.abs(opponentsRating) - Math.abs(myRating)) / 400))
  );
}

/**
 * VB6 Line: 133-137 - Get ladder name from current directory
 */
export function getLadderName(): string {
  const currentPath = window.location.pathname;
  const lastSlashIndex = currentPath.lastIndexOf("/");
  return currentPath.substring(lastSlashIndex + 1);
}

/**
 * VB6 Line: 138-154 - Player array to string conversion
 * Translates player and score arrays to hash string format
 */
export function entry2string(
  playersList: number[],
  scoreList: number[],
): string {
  // VB6 Line: 140-145 - Swap to ensure correct order
  if (playersList[0] > playersList[1]) {
    const temp = playersList[0];
    playersList[0] = playersList[1];
    playersList[1] = temp;
  }
  if (playersList[3] > playersList[4]) {
    const temp = playersList[3];
    playersList[3] = playersList[4];
    playersList[4] = temp;
  }

  const resultParts: string[] = [
    playersList[0].toString(),
    ":",
    playersList[1].toString(),
    RESULT_STRING.charAt(scoreList[0]),
  ];
  if (scoreList[1] > 0) {
    resultParts.push(RESULT_STRING.charAt(scoreList[1]));
  }
  resultParts.push(playersList[3].toString());
  resultParts.push(":");
  resultParts.push(playersList[4].toString());

  return resultParts.join("");
}

/**
 * VB6 Line: 155-271 - Parse entry string to structured data
 * Parses game entry like "23:29LW" into game details
 */
export function parseEntry(
  myText: string,
  playersList: number[],
  scoreList: number[],
): number {
  // VB6 Line: 167-171 - Reset arrays
  playersList[0] = 0;
  playersList[1] = 0;
  playersList[2] = 0;
  playersList[3] = 0;
  playersList[4] = 0;
  playerOrRow = true;

  // Normalize input to uppercase
  const normalizedText = myText.toUpperCase();
  const strlen = normalizedText.length;
  if (strlen < 2) return -3;

  const results: string[] = [];
  let entry = 0;
  let numOrChar = 1; // 0 = number, 1 = char
  let entryString = "";
  let errorNum = 0;
  let resultIndex = 0; // Track which result slot (0 or 1)
  let hasColon = false; // Track if colon was used (indicates 4-player format)

  for (let i = 1; i <= strlen; i++) {
    const mychar = normalizedText.substring(i - 1, i);
    const myasc = mychar.charCodeAt(0);

    if (myasc > 33) {
      // VB6 Line: 180-183 - Handle underscore separator
      if (myasc === 95) {
        if (i === strlen) break;
        errorNum = 1;
        break;
      }

      // VB6 Line: 185-204 - Parse numbers and characters
      if (myasc >= 48 && myasc <= 57) {
        // Digit - accumulate in entryString
        numOrChar = 0;
      } else {
        // Non-digit character
        // Only store before colons, not before W/L/D
        if (myasc === 58) {
          // Colon separates pairs within same team
          hasColon = true;
          if (
            numOrChar === 0 &&
            playersList.length > entry &&
            entryString !== ""
          ) {
            playersList[entry] = parseInt(entryString);
            if (playersList[entry] > CONSTANTS.GROWS_MAX) {
              errorNum = 9;
              break;
            }
            entry++;
          }
          entryString = "";
          continue;
        } else if (mychar === "W" || mychar === "L" || mychar === "D") {
          // Score character - but first store the player number
          if (
            numOrChar === 0 &&
            playersList.length > entry &&
            entryString !== ""
          ) {
            playersList[entry] = parseInt(entryString);
            if (playersList[entry] > CONSTANTS.GROWS_MAX) {
              errorNum = 9;
              break;
            }
            entry++;
          }
          // Clear entryString since we stored the player
          entryString = "";
          // Store result character directly, don't add to entryString
          results[resultIndex] = mychar;
          resultIndex = resultIndex + 1;
          continue;
        } else {
          errorNum = 2;
        }
        numOrChar = 1;
      }

      entryString += mychar;
      if (numOrChar === 1) {
        // Store score character in result slot (for backward compatibility)
        results[resultIndex] = entryString;
        // Move to next result slot for next score
        resultIndex = resultIndex + 1;
        entryString = ""; // Reset entryString after storing result
      }
    }
  }

  // Store any remaining number at the end of the string
  if (numOrChar === 0 && playersList.length > entry && entryString !== "") {
    playersList[entry] = parseInt(entryString);
    entry++;
    if (playersList[entry - 1] > CONSTANTS.GROWS_MAX) {
      errorNum = 9;
    }
  }

  // VB6 Line: 215-220 - Validate game format
  // Must have at least 2 players and at least 1 result
  if (entry < 2) {
    errorNum = 3; // Incomplete entry - need at least 2 players
  } else if (resultIndex === 0) {
    errorNum = 3; // Incomplete entry - need at least 1 result
  } else if (hasColon && entry < 4) {
    // If colon used, must be 4-player format with all 4 players
    errorNum = 7; // Missing player 4
  } else if (entry === 2 && resultIndex > 2) {
    // For 2-player games, allow up to 2 results
    errorNum = 5; // too many results
  } else if (entry === 4 && resultIndex < 1) {
    // For 4-player games, must have at least 1 result
    errorNum = 3; // Incomplete entry
  } else if (entry === 4 && resultIndex > 2) {
    // For 4-player games, allow up to 2 results
    errorNum = 5; // too many results
  }

  // VB6 Line: 223-228 - Process scores
  scoreList[0] = RESULT_STRING.indexOf(results[0]) - 1;
  scoreList[1] = results[1] ? RESULT_STRING.indexOf(results[1]) - 1 : 0;

  // VB6 Line: 229-245 - Normalize player order
  // Store original values before normalization for display
  // Players stored sequentially at indices 0,1,2,3
  playersList[5] = playersList[0];
  playersList[6] = playersList[1];
  playersList[7] = playersList[2];
  playersList[8] = playersList[3];

  if (playersList[2] > 0) {
    // 4-player game
    if (playersList[0] > playersList[1]) {
      const temp = playersList[0];
      playersList[0] = playersList[1];
      playersList[1] = temp;
    }
    if (playersList[2] > playersList[3]) {
      const temp = playersList[2];
      playersList[2] = playersList[3];
      playersList[3] = temp;
    }

    // VB6 Line: 236-241 - Swap sides if necessary
    if (playersList[0] > playersList[2]) {
      const temp = playersList[0];
      playersList[0] = playersList[2];
      playersList[2] = temp;
      const temp2 = playersList[1];
      playersList[1] = playersList[3];
      playersList[3] = temp2;
      scoreList[0] = 4 - scoreList[0];
      if (scoreList[1] > 0) scoreList[1] = 4 - scoreList[1];
    }

    // VB6 Line: 243-270 - Create hash value
    const res = playersList[3];
    const computedRes =
      ((((res * 128 + playersList[2]) * 4 + scoreList[1]) * 4 + scoreList[0]) *
        128 +
        playersList[1]) *
        128 +
      playersList[0];

    // VB6 Line: 255-257 - Validate entry
    // Check for missing player 3 or 4
    if (playersList[3] > 0 && playersList[2] === 0) {
      errorNum = 7;
    }

    // VB6 Line: 258-260 - Handle duplicates
    // Check all pairs for duplicates
    if (
      playersList[0] === playersList[1] ||
      playersList[0] === playersList[2] ||
      playersList[0] === playersList[3] ||
      playersList[1] === playersList[2] ||
      playersList[1] === playersList[3] ||
      playersList[2] === playersList[3]
    ) {
      if (shouldLog(10)) {
        console.log(
          `PARSE FAILED [4-player]: "${normalizedText}" -> duplicate players`,
        );
      }
      return -4;
    }

    // VB6 Line: 262-270 - Return result
    if (
      errorNum !== 0 ||
      playersList[0] === 0 ||
      playersList[1] === 0 ||
      playersList[2] === 0 ||
      scoreList[0] < 0 ||
      scoreList[1] < 0
    ) {
      const reason = errorNum !== 0 ? `error${errorNum}` : "invalid values";
      if (shouldLog(10)) {
        console.log(
          `PARSE FAILED [4-player]: "${normalizedText}" -> ${reason}`,
        );
      }
      return errorNum === 0 ? -3 : -errorNum;
    }

    // VB6 Line: 262-270 - Return result
    if (
      errorNum !== 0 ||
      playersList[0] === 0 ||
      playersList[1] === 0 ||
      playersList[2] === 0 ||
      scoreList[0] < 0 ||
      scoreList[1] < 0
    ) {
      return errorNum === 0 ? -3 : -errorNum;
    }
    return computedRes;
  } else {
    // 2-player game
    if (
      errorNum !== 0 ||
      playersList[0] === 0 ||
      playersList[1] === 0 ||
      scoreList[0] < 0
    ) {
      const reason = errorNum !== 0 ? `error${errorNum}` : "invalid values";
      if (shouldLog(10)) {
        console.log(
          `PARSE FAILED [2-player]: "${normalizedText}" -> ${reason}`,
        );
      }
      return errorNum === 0 ? -3 : -errorNum;
    }
    const computedRes =
      ((playersList[0] * 128 + playersList[1]) * 4 + scoreList[0]) * 128 + 0;
    return computedRes;
  }
}

/**
 * VB6 Line: 156-128 - String to long conversion (wrapper for parseEntry)
 */
export function string2long(
  game: string,
  playersList: number[],
  scoreList: number[],
): number {
  return parseEntry(game, playersList, scoreList);
}

/**
 * VB6 Line: 107-125 - Long to string conversion
 * Converts hash value back to game string like "23:29LW"
 */
export function long2string(game: number): string {
  const resultParts: string[] = [];
  let tempGame = game;

  // VB6 Line: 111-121 - Extract structured data
  resultParts.push((tempGame % 128).toString());
  tempGame = Math.floor(tempGame / 128);
  resultParts.push(":");
  resultParts.push((tempGame % 128).toString());
  tempGame = Math.floor(tempGame / 128);
  resultParts.push(RESULT_STRING.charAt(tempGame % 4));
  tempGame = Math.floor(tempGame / 4);
  const nextChar = RESULT_STRING.charAt(tempGame % 4);
  if (nextChar !== "O") {
    resultParts.push(nextChar);
  }
  tempGame = Math.floor(tempGame / 4);
  resultParts.push((tempGame % 128).toString());
  tempGame = Math.floor(tempGame / 128);
  resultParts.push(":");
  resultParts.push((tempGame % 128).toString());

  // VB6 Line: 122-124 - Clean up empty parts
  const finalResult = resultParts.join("").replace(/ /g, "").replace(":0", "");
  return finalResult;
}

/**
 * VB6 Line: 369-374 - Swap two integers
 */
export function swapint(a: number, b: number): number {
  const c = a;
  a = b;
  b = c;
  return a;
}

/**
 * VB6 Line: 375-380 - Reset placement tracking
 */
export function resetPlacement(): void {
  players = [0, 0, 0, 0, 0, 0];
}

/**
 * VB6 Line: 272-297 - Hash function initialization
 * Sets up pseudorandom array for hash generation
 */
export function hashInitialize(): void {
  const rand8: number[] = Array.from({ length: 256 }, (_, i) => i);
  let k = 7;

  // VB6 Line: 286-293 - RC4-style key mixing
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 256; i++) {
      const s = rand8[i];
      k = (k + s) % 256;
      const temp = rand8[i];
      rand8[i] = rand8[k];
      rand8[k] = temp;
    }
  }

  hashArray = new Array(2048).fill("");
  hashIndex = new Array(2048).fill(0);
}

export let hashArray: string[] = [];
export let hashIndex: number[] = [];

/**
 * VB6 Line: 328-368 - Data hash function
 * Hash data using string-based XOR method
 */
export function dataHash(
  skey: string,
  sval: string,
  hashMethod: number,
): string {
  const b = new TextEncoder().encode(skey);
  let lKeyVal = b[0];

  // VB6 Line: 339-343 - Build hash value from digits
  for (let i = 1; i < b.length; i++) {
    if (b[i] >= 48 && b[i] <= 57) {
      lKeyVal = lKeyVal * 10 + (b[i] - 48);
    }
  }

  let i = lKeyVal % 2048;
  let found = false;
  let storedAtIdx = -1;

  // DEBUG: Log what we're doing
  if (shouldLog(10)) {
    console.log(
      `dataHash: skey="${skey}", sval="${sval}", lKeyVal=${lKeyVal}, startIdx=${i}`,
    );
  }

  // VB6 Line: 344-362 - Collision resolution loop
  while (!found) {
    if (lKeyVal === hashIndex[i]) {
      if (shouldLog(10)) {
        console.log(
          `dataHash: FOUND existing at idx ${i} (keyVal=${hashIndex[i]}), method=${hashMethod}`,
        );
      }
      // VB6 Line: 347-350 - Delete entry if requested
      if (hashMethod === 2) {
        hashIndex[i] = 0;
        hashArray[i] = "";
      }
      found = true;
    } else if (hashIndex[i] === 0) {
      if (shouldLog(10)) {
        console.log(
          `dataHash: EMPTY slot at idx ${i}, storing keyVal=${lKeyVal}, value="${sval}"`,
        );
      }
      // VB6 Line: 354-357 - Add new entry
      if (hashMethod === 0) {
        hashIndex[i] = lKeyVal;
        hashArray[i] = sval;
        storedAtIdx = i;
      }
      found = true;
    } else {
      if (shouldLog(10)) {
        console.log(
          `dataHash: COLLISION at idx ${i} (keyVal=${hashIndex[i]} != ${lKeyVal}), trying next...`,
        );
      }
      i++;
      if (i === 2048) i = 0;
    }
  }

  // DEBUG: Log failed storage attempts
  if (hashMethod === 0 && storedAtIdx === -1 && shouldLog(10)) {
    console.log(
      `dataHash: FAILED TO STORE - skey="${skey}", sval="${sval}" (hash table full or collision loop ended)`,
    );
  }

  return hashArray[i];
}

/**
 * Process game results from all players and calculate ratings
 * VB6-inspired implementation with hash table validation
 */
export interface ValidationResult {
  hashValue: number;
  player1: number;
  player2: number;
  player3: number;
  player4: number;
  score1: number;
  score2: number;
  resultIndex: number;
  isValid: boolean;
  error: number;
  originalString: string;
  playerRank: number; // The rank of the player with the invalid result
}

export interface MatchData {
  player1: number;
  player2: number;
  player3: number;
  player4: number;
  score1: number;
  score2: number;
}

export interface ProcessResult {
  matches: MatchData[];
  hasErrors: boolean;
  errorCount: number;
  errors: ValidationResult[];
}

/**
 * Process all game results, validate them, and return valid matches
 */
export function processGameResults(
  playersList: PlayerData[],
  numRounds: number = 31,
): ProcessResult {
  const results: MatchData[] = [];
  const errors: ValidationResult[] = [];
  const parsedPlayersList = [0, 0, 0, 0, 0];
  const parsedScoreList = [0, 0];
  const matchResults = new Map<
    string,
    {
      result: string;
      playerRank: number;
      player1: number;
      player2: number;
      player3: number;
      player4: number;
      score1: number;
      score2: number;
    }[]
  >();

  hashInitialize();

  let errorCount = 0;

  for (let round = 0; round < numRounds; round++) {
    const processedPairs = new Set<number>();

    for (let i = 0; i < playersList.length; i++) {
      const player = playersList[i];
      const result = player.gameResults?.[round] || null;

      if (!result || result.trim() === "") continue;

      // Reset parsed arrays for each result
      parsedPlayersList[0] = 0;
      parsedPlayersList[1] = 0;
      parsedPlayersList[3] = 0;
      parsedPlayersList[4] = 0;
      parsedScoreList[0] = 0;
      parsedScoreList[1] = 0;

      const hashValue = string2long(result, parsedPlayersList, parsedScoreList);

      if (hashValue < 0) {
        errorCount++;
        errors.push({
          hashValue,
          player1: parsedPlayersList[0],
          player2: parsedPlayersList[1],
          player3: parsedPlayersList[2], // BUG FIX: was [3]
          player4: parsedPlayersList[3], // BUG FIX: was [4]
          score1: parsedScoreList[0],
          score2: parsedScoreList[1],
          resultIndex: round,
          isValid: false,
          error: -hashValue,
          playerRank: player.rank,
          originalString: result,
        });
        continue;
      }

      if (processedPairs.has(hashValue)) continue;

      const player1Rank = parsedPlayersList[0];
      const player2Rank = parsedPlayersList[1]; // BUG FIX: was [3], should be [1]
      const player1Score = parsedScoreList[0];
      const player2Score = parsedScoreList[1];

      // DEBUG: Log validation errors around player rank checks
      if (player1Rank <= 0 || player2Rank <= 0) {
        errorCount++;
        if (shouldLog(10)) {
          console.log(
            `ERROR [650]: Invalid player ranks - p1=${player1Rank}, p2=${player2Rank}, result="${result}"`,
          );
        }
        continue;
      }

      if (player1Rank > 200 || player2Rank > 200) {
        errorCount++;
        if (shouldLog(10)) {
          console.log(
            `ERROR [655]: Player ranks exceed 200 - p1=${player1Rank}, p2=${player2Rank}, result="${result}"`,
          );
        }
        continue;
      }

      const player1 = playersList[player1Rank - 1];
      const player2 = playersList[player2Rank - 1];

      if (!player1 || !player2) {
        errorCount++;
        if (shouldLog(10)) {
          console.log(
            `ERROR [660]: Player not found - p1Rank=${player1Rank}, p2Rank=${player2Rank}, result="${result}"`,
          );
        }
        continue;
      }

      const key = `${player1Rank}-${player2Rank}`;
      if (!matchResults.has(key)) {
        matchResults.set(key, []);
      }
      matchResults.get(key)!.push({
        result,
        playerRank: player.rank,
        player1: parsedPlayersList[0],
        player2: parsedPlayersList[1],
        player3: parsedPlayersList[2], // BUG FIX: was [3]
        player4: parsedPlayersList[3], // BUG FIX: was [4]
        score1: parsedScoreList[0],
        score2: parsedScoreList[1],
      });

      processedPairs.add(hashValue);

      const _matchKey = `${hashValue}_${round}`;
      dataHash(_matchKey, result, 0);

      // DEBUG: Log what we're storing
      if (shouldLog(10)) {
        const is4Player = parsedPlayersList[2] > 0 && parsedPlayersList[3] > 0;
        console.log(
          `Storing hashValue=${hashValue}, round=${round}, is4Player=${is4Player}, result="${result}", player1=${parsedPlayersList[0]}, player2=${parsedPlayersList[1]}`,
        );
      }

      results.push({
        player1: parsedPlayersList[0],
        player2: parsedPlayersList[1],
        player3: parsedPlayersList[2], // BUG FIX: was [3]
        player4: parsedPlayersList[3], // BUG FIX: was [4]
        score1: player1Score,
        score2: player2Score,
      });
    }
  }

  // DEBUG: Convert hash table back to results
  if (shouldLog(10)) {
    console.log("\n=== HASH TABLE DEBUG ===");
    const hashResults: { index: number; keyVal: number; value: string }[] = [];
    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== "" && hashIndex[i] !== 0) {
        hashResults.push({
          index: i,
          keyVal: hashIndex[i],
          value: hashArray[i],
        });
        console.log(
          `Hash[${i}]: keyVal=${hashIndex[i]}, value="${hashArray[i]}"`,
        );
      }
    }
    if (shouldLog(4)) {
      console.log(`Total hash entries stored: ${hashResults.length}`);
      console.log(
        "Hash table results:",
        hashResults.map((h) => h.value).join(", "),
      );

      // Count 2-player vs 4-player in all matches
      const twoPlayerMatches = results.filter(
        (m) => m.player3 === 0 && m.player4 === 0,
      );
      const fourPlayerMatches = results.filter(
        (m) => m.player3 > 0 && m.player4 > 0,
      );
      console.log(`\nTotal matches: ${results.length}`);
      console.log(`2-player matches: ${twoPlayerMatches.length}`);
      console.log(`4-player matches: ${fourPlayerMatches.length}`);

      console.log("========================\n");
    }
  }

  // DEBUG: Stop processing here
  return {
    matches: [],
    hasErrors: false,
    errorCount: 0,
    errors: [],
  };

  for (const [_, entries] of matchResults.entries()) {
    if (entries.length < 2) continue;

    const allSame = entries.every(
      (e, i) => i === 0 || e.result === entries[0].result,
    );
    if (!allSame) {
      for (const entry of entries) {
        errorCount++;
        if (shouldLog(10)) {
          console.log(
            `ERROR [conflict]: Players disagree on result - p1=${entry.player1}, p2=${entry.player2}, p3=${entry.player3}, p4=${entry.player4}, result="${entry.result}"`,
          );
        }
        errors.push({
          hashValue: 0,
          player1: entry.player1,
          player2: entry.player2,
          player3: entry.player3,
          player4: entry.player4,
          score1: entry.score1,
          score2: entry.score2,
          resultIndex: 0,
          isValid: false,
          error: 10,
          originalString: entry.result,
          playerRank: entry.playerRank,
        });
      }
    }
  }

  return {
    matches: results,
    hasErrors: errorCount > 0,
    errorCount: errorCount,
    errors,
  };
}

/**
 * Calculate Elo ratings based on game results
 */
export function calculateRatings(
  playersList: PlayerData[],
  matches: MatchData[],
): PlayerData[] {
  const EloK = 20;
  const playersCopy = playersList.map((p) => ({ ...p }));

  for (const match of matches) {
    const p1Index = match.player1 - 1;
    const p2Index = match.player2 - 1;

    if (p1Index < 0 || p1Index >= playersCopy.length) continue;
    if (p2Index < 0 || p2Index >= playersCopy.length) continue;

    const p1 = playersCopy[p1Index];
    const p2 = playersCopy[p2Index];

    if (!p1 || !p2) continue;

    const p1Rating = Math.abs(p1.rating);
    const p2Rating = Math.abs(p2.rating);

    if (p1Rating === 0 && p2Rating === 0) continue;

    const expectedP1 = formula(p1Rating, p2Rating);
    const expectedP2 = formula(p2Rating, p1Rating);

    let actualP1 = 0.5;
    let actualP2 = 0.5;

    if (match.score1 === 1) {
      actualP1 = 1;
      actualP2 = 0;
    } else if (match.score1 === 3) {
      actualP1 = 0;
      actualP2 = 1;
    }

    const p1NewRating = Math.round(p1Rating + EloK * (actualP1 - expectedP1));
    const p2NewRating = Math.round(p2Rating + EloK * (actualP2 - expectedP2));

    p1.nRating = Math.max(0, p1NewRating);
    p2.nRating = Math.max(0, p2NewRating);
  }

  return playersCopy;
}

/**
 * Repopulate game results from validated matches
 */
export function repopulateGameResults(
  playersList: PlayerData[],
  matches: MatchData[],
  numRounds: number = 31,
): PlayerData[] {
  const playersCopy = playersList.map((p) => ({
    ...p,
    gameResults: new Array(numRounds).fill(null),
  }));

  let resultIndex = 0;
  for (const match of matches) {
    const p1Index = match.player1 - 1;
    const p2Index = match.player2 - 1;

    if (p1Index < 0 || p1Index >= playersCopy.length) continue;
    if (p2Index < 0 || p2Index >= playersCopy.length) continue;

    const p1 = playersCopy[p1Index];
    const p2 = playersCopy[p2Index];

    if (!p1 || !p2) continue;

    // DEBUG: Log repopulation
    if (shouldLog(10)) {
      console.log(
        `REPOPULATING: resultIndex=${resultIndex}, p1Rank=${match.player1}, p2Rank=${match.player2}, score1=${match.score1}, score2=${match.score2}`,
      );
    }

    const result1 = resultCodeToString(match.score1);
    const result2 = resultCodeToString(match.score2);

    if (result1) {
      p1.gameResults[resultIndex] = result1 + "_";
    }
    if (result2) {
      p2.gameResults[resultIndex] = result2 + "_";
    }
    resultIndex++;
  }

  return playersCopy;
}

function resultCodeToString(code: number): string {
  if (code === 0) return "O";
  if (code === 1) return "L";
  if (code === 2) return "D";
  if (code === 3) return "W";
  return "O";
}

export const ERROR_MESSAGES: Record<number, string> = {
  1: "Invalid format",
  2: "Invalid character",
  3: "Incomplete entry",
  4: "Duplicate players",
  5: "Too many results",
  7: "Missing player 4",
  9: "Player rank exceeds 200",
  10: "Conflicting results - players disagree on outcome",
};

export function getValidationErrorMessage(errorCode: number): string {
  return ERROR_MESSAGES[errorCode] || "Unknown error";
}

export interface ValidationResultResult {
  isValid: boolean;
  error?: number;
  message?: string;
}

export function validateGameResult(input: string): ValidationResultResult {
  if (!input.trim()) {
    return { isValid: false, error: 3, message: "Incomplete entry" };
  }

  const parsedPlayersList = [0, 0, 0, 0, 0];
  const parsedScoreList = [0, 0];
  const hashValue = string2long(input, parsedPlayersList, parsedScoreList);

  if (hashValue < 0) {
    return {
      isValid: false,
      error: Math.abs(hashValue),
      message: getValidationErrorMessage(Math.abs(hashValue)),
    };
  }

  return { isValid: true };
}

export interface UpdatePlayerGameDataResult {
  isValid: boolean;
  error?: number;
  message?: string;
  parsedPlayersList?: number[];
  parsedScoreList?: number[];
  originalString: string;
  resultString?: string;
  parsedPlayer1Rank?: number;
  parsedPlayer2Rank?: number;
  parsedPlayer3Rank?: number;
  parsedPlayer4Rank?: number;
}

export function updatePlayerGameData(
  input: string,
  addUnderscore: boolean = true,
): UpdatePlayerGameDataResult {
  if (!input.trim()) {
    return {
      isValid: false,
      error: 3,
      message: "Incomplete entry",
      originalString: input,
      parsedPlayer1Rank: 0,
      parsedPlayer2Rank: 0,
      parsedPlayer3Rank: 0,
      parsedPlayer4Rank: 0,
    };
  }

  const parsedPlayersList = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const parsedScoreList = [0, 0];
  const hashValue = string2long(input, parsedPlayersList, parsedScoreList);

  if (hashValue < 0) {
    const parsedPlayer1Rank = parsedPlayersList[5];
    const parsedPlayer2Rank = parsedPlayersList[6];
    const parsedPlayer3Rank = parsedPlayersList[7];
    const parsedPlayer4Rank = parsedPlayersList[8];

    return {
      isValid: false,
      error: Math.abs(hashValue),
      message: getValidationErrorMessage(Math.abs(hashValue)),
      parsedPlayersList: parsedPlayersList,
      parsedScoreList: parsedScoreList,
      originalString: input,
      parsedPlayer1Rank,
      parsedPlayer2Rank,
      parsedPlayer3Rank,
      parsedPlayer4Rank,
    };
  }

  const resultString = addUnderscore ? input + "_" : input;
  const parsedPlayer1Rank = parsedPlayersList[5];
  const parsedPlayer2Rank = parsedPlayersList[6];
  const parsedPlayer3Rank = parsedPlayersList[7];
  const parsedPlayer4Rank = parsedPlayersList[8];

  return {
    isValid: true,
    parsedPlayersList: parsedPlayersList,
    parsedScoreList: parsedScoreList,
    originalString: input,
    resultString,
    parsedPlayer1Rank,
    parsedPlayer2Rank,
    parsedPlayer3Rank,
    parsedPlayer4Rank,
  };
}
