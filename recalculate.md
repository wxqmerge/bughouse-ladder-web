# Recalculate Ratings Flow

## High-Level Pseudocode

```
FUNCTION recalculateRatings():
    # [LadderForm.tsx:403]

    IF players is empty:
        LOG error and return

    # Step 1: Parse & Validate All Game Results
    # [hashUtils.ts:548] processGameResults()
    matches, hasErrors, errorCount, errors = processGameResults(players, 31)

    IF hasErrors AND errors exist:
        # Enter correction mode
        setIsRecalculating(true)
        setPendingPlayers(players)      # [LadderForm.tsx:415]
        setPendingMatches(matches)
        setCurrentError(errors[0])
        setEntryCell(first error location)
        setWalkthroughErrors(all errors)
        setWalkthroughIndex(0)
    ELSE:
        # No errors - proceed to repopulation and rating calculation
        setIsRecalculating(false)
        processed = repopulateGameResults(players, matches, 31)   # [hashUtils.ts:882]
        calculated = calculateRatings(processed, matches)         # [hashUtils.ts:997]
        setPlayers(calculated)
        saveToLocalStorage(calculated)                            # [LadderForm.tsx:431]
```

## Step 1: processGameResults() - Parse & Validate

### Purpose:

Parse all game result strings from players' gameResults arrays, validate them, and build a list of matches.

### Flow:

```
FUNCTION processGameResults(players, numRounds):
    # [hashUtils.ts:548]

    hashInitialize()  # Clear hash table (line 621)
    matches = []
    errors = []
    errorCount = 0
    matchResults = new Map()  # For conflict detection

    FOR each round (0 to numRounds-1):
        processedPairs = new Set()  # Track already-processed pairs in this round

        FOR each player:
            result = player.gameResults[round]

            IF result is empty: continue

            # Parse the result string (e.g., "1W5_" or "1:2W3:4_")
            hashValue = string2long(result, parsedPlayersList, parsedScoreList)  # [hashUtils.ts:637]

            # Check for parse errors
            IF hashValue < 0:
                errorCount++
                ADD to errors with errorCode (-hashValue)
                continue

            # Skip if this pair was already processed
            IF hashValue in processedPairs: continue
            ADD hashValue to processedPairs

            # Extract parsed data
            player1Rank = parsedPlayersList[0]
            player2Rank = parsedPlayersList[1]  # FIXED: was incorrectly [3]

            # Validate ranks
            IF player1Rank <= 0 OR player2Rank <= 0:
                errorCount++
                ADD to errors (error code: incomplete entry)
                continue

            # Check for self-play (same player on both sides)
            IF player1Rank == player2Rank:
                errorCount++
                ADD to errors (error code: duplicate players / self-play)
                LOG "ERROR [SELF-PLAY]: Player plays against themselves"
                continue

            IF player1Rank > 200 OR player2Rank > 200:
                errorCount++
                ADD to errors (error code: rank exceeds 200)
                continue

            # Check players exist in roster
            IF players[player1Rank-1] NOT EXISTS OR players[player2Rank-1] NOT EXISTS:
                errorCount++
                ADD to errors (error code: player not found)
                continue

            # Store match data for conflict detection
            key = "${player1Rank}-${player2Rank}"
            matchResults.get(key).push({result, playerRank, ...})

            # Add to matches list
            matches.push({
                player1: parsedPlayersList[0],
                player2: parsedPlayersList[1],
                player3: parsedPlayersList[2],  # FIXED: was incorrectly [3]
                player4: parsedPlayersList[3],  # FIXED: was incorrectly [4]
                score1: parsedScoreList[0],
                score2: parsedScoreList[1],
            })

            # Store in hash table for deduplication
            dataHash("${hashValue}_${round}", result, 0)  # [hashUtils.ts:685]

    # Check for conflicting results (players disagree on outcome)
    FOR each match pair in matchResults:
        IF multiple different result strings recorded:
            errorCount++
            ADD all entries to errors with errorCode=10

    RETURN {matches, hasErrors: errorCount > 0, errorCount, errors}
```

## Step 2: Error Correction Loop (if errors exist)

```
FUNCTION handleCorrectionSubmit(correctedString):
    # [LadderForm.tsx:439]

    IF correctedString is empty:
        # Clear the cell
        UPDATE player.gameResults[round] = ""
        REMOVE current error from walkthroughErrors
    ELSE:
        # Validate correction
        validation = updatePlayerGameData(correctedString, true)  # [hashUtils.ts:940]

        IF NOT validation.isValid:
            SHOW alert with error code
            return

        # Apply correction
        UPDATE player.gameResults[round] = correctedString + "_"

    # Remove processed error from list
    walkthroughErrors = filter out current error

    IF errors remain:
        MOVE to next error
        setEntryCell(next error location)
    ELSE:
        completeRatingCalculation(pendingPlayers)
```

## Step 3: repopulateGameResults() - Clear & Refill Results

### Purpose:

Clear all game results from players, then refill them with validated match data.

```
FUNCTION repopulateGameResults(players, matches):
    # [hashUtils.ts:882]

    # Step 1: Clear all game results
    playersCopy = each player with empty gameResults array

    resultIndex = 0
    totalSet = 0

    FOR each match in matches:
        # Build full result strings for all players involved
        resultForP1 = buildResultStringForPlayer(match.player1, match, 0)
        resultForP2 = buildResultStringForPlayer(match.player2, match, 0)

        IF 4-player game:
            resultForP3 = buildResultStringForPlayer(match.player3, match, 1)
            resultForP4 = buildResultStringForPlayer(match.player4, match, 1)

        # Set results with "_" suffix
        p1.gameResults[resultIndex] = resultForP1 + "_"
        p2.gameResults[resultIndex] = resultForP2 + "_"

        IF 4-player game:
            p3.gameResults[resultIndex] = resultForP3 + "_"
            p4.gameResults[resultIndex] = resultForP4 + "_"

        totalSet++
        resultIndex++

    RETURN playersCopy

FUNCTION buildResultStringForPlayer(playerRank, match, scoreIndex):
    IF 4-player game:
        # Format: "A:BWC:D" where A,B are first pair, C,D second pair
        IF playerRank == p1: return "${p1}:${p2}${resultCode} ${p3}:${p4}"
        IF playerRank == p2: return "${p2}:${p1}${oppositeScore} ${p4}:${p3}"
        IF playerRank == p3: return "${p3}:${p4}${resultCode} ${p1}:${p2}"
        IF playerRank == p4: return "${p4}:${p3}${oppositeScore} ${p2}:${p1}"

    ELSE 2-player game:
        # Format: "AWB" or "BW A"
        IF playerRank == p1: return "${p1}${resultCode}${p2}"
        IF playerRank == p2: return "${p2}${oppositeScore}${p1}"

    RETURN ""
```

## Step 4: calculateRatings() - Elo Calculation

```
FUNCTION calculateRatings(players, matches):
    # [hashUtils.ts:997]

    EloK = 20
    playersCopy = deep copy of players

    FOR each match in matches:
        p1 = players[match.player1 - 1]
        p2 = players[match.player2 - 1]

        IF invalid players: continue

        p1Rating = abs(p1.rating)
        p2Rating = abs(p2.rating)

        IF both ratings are 0: continue

        # Calculate expected scores using Elo formula
        expectedP1 = 1 / (1 + 10^((p2Rating - p1Rating) / 400))  # [hashUtils.ts:90]
        expectedP2 = 1 / (1 + 10^((p1Rating - p2Rating) / 400))

        # Determine actual scores from match result
        IF match.score1 == 1 (loss):   actualP1 = 0, actualP2 = 1
        ELSE IF score1 == 3 (win):     actualP1 = 1, actualP2 = 0
        ELSE:                          actualP1 = 0.5, actualP2 = 0.5 (draw)

        # Apply Elo formula: newRating = old + K * (actual - expected)
        p1NewRating = round(p1Rating + EloK * (actualP1 - expectedP1))
        p2NewRating = round(p2Rating + EloK * (actualP2 - expectedP2))

        p1.nRating = max(0, p1NewRating)
        p2.nRating = max(0, p2NewRating)

    RETURN playersCopy
```

## Debug Logging Levels

| Level | Description  | Shows                                      |
| ----- | ------------ | ------------------------------------------ |
| 0     | Most verbose | All logs including individual hash entries |
| 1-3   | Verbose      | Match details, sample player logs          |
| 4-5   | Default (5)  | Summary stats, repopulation details        |
| 6-9   | Quiet        | Only critical errors                       |
| 10+   | Minimal      | Critical errors only                       |

## Common Errors

| Code | Error Name              | Description                               |
| ---- | ----------------------- | ----------------------------------------- |
| 1    | Invalid format          | Result string has wrong structure         |
| 2    | Invalid character       | Contains invalid characters               |
| 3    | Incomplete entry        | Missing required data (players or scores) |
| 4    | Duplicate players       | Same player appears twice (self-play)     |
| 5    | Too many results        | More score entries than allowed           |
| 7    | Missing player 4        | Colon used but only 2-3 players specified |
| 9    | Player rank exceeds 200 | Player rank > 200                         |
| 10   | Conflicting results     | Players disagree on outcome               |

## Hash Table Usage

The hash table is used for:

1. **Deduplication**: Track which player pairs have been processed in each round
2. **Conflict detection**: Store all results for each match pair to detect disagreements

Hash key format: `${hashValue}_${round}`
Hash storage: `dataHash(key, result, 0)` stores result string at computed index

## Notes & Fixes Applied

- Fixed player array indices: `player2 = parsedPlayersList[1]` (was incorrectly `[3]`)
- Fixed player3/player4: `player3 = parsedPlayersList[2]`, `player4 = parsedPlayersList[3]` (were incorrectly `[3]` and `[4]`)
- Added self-play validation to catch results like "1W1"
- Removed early return that was cutting off match processing
- All debug logs use `shouldLog(threshold)` with configurable levels
