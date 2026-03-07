# Recalculate Ratings Flow

## High-Level Pseudocode

```
FUNCTION recalculateRatings():
    # [LadderForm.tsx:379]

    IF players is empty:
        LOG error and return

    # Step 1: Parse & Validate All Game Results
    # [hashUtils.ts:548] processGameResults()
    matches, hasErrors, errorCount, errors = processGameResults(players, 31)

    IF hasErrors AND errors exist:
        # Enter correction mode
        setIsRecalculating(true)
        setPendingPlayers(players)      # [LadderForm.tsx:400]
        setPendingMatches(matches)
        setCurrentError(errors[0])
        setEntryCell(first error location)
        setWalkthroughErrors(all errors)
        setWalkthroughIndex(0)
    ELSE:
        # No errors - complete calculation immediately
        setIsRecalculating(false)
        processed = repopulateGameResults(players, matches, 31)   # [hashUtils.ts:757]
        calculated = calculateRatings(processed, matches)         # [hashUtils.ts:709]
        setPlayers(calculated)
        saveToLocalStorage(calculated)                            # [LadderForm.tsx:415]
```

## Step 1: processGameResults() - Parse & Validate

```
FUNCTION processGameResults(players, numRounds):
    # [hashUtils.ts:548]

    matches = []
    errors = []
    hashInitialize()  # Clear hash table

    FOR each round (0 to numRounds-1):
        processedPairs = new Set()

        FOR each player:
            result = player.gameResults[round]

            IF result is empty: continue

            # Parse game string like "23:29LW"
            hashValue = string2long(result, parsedPlayers, parsedScores)  # [hashUtils.ts:380]

            IF hashValue < 0:  # Parse error
                ADD to errors with errorCode
                continue

            # Skip if already processed this match
            IF hashValue in processedPairs: continue
            ADD hashValue to processedPairs

            # Validate player ranks exist
            IF player1Rank or player2Rank out of bounds:
                ADD to errors
                continue

            # Track for conflict detection
            addToMatchResults(player1Rank-player2Rank, result)

            # Store in hash table
            dataHash(hashValue + "_" + round, result, 0)  # [hashUtils.ts:465]

            ADD to matches
            matches.push({player1, player2, player3, player4, score1, score2})

    # Check for conflicting results (players disagree)
    FOR each match pair in matchResults:
        IF multiple different result strings recorded:
            ADD all entries to errors with errorCode=10

    RETURN {matches, hasErrors, errorCount, errors}
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
        validation = updatePlayerGameData(correctedString, true)  # [hashUtils.ts:859]

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

## Step 3: completeRatingCalculation()

```
FUNCTION completeRatingCalculation(pendingPlayers):
    # [LadderForm.tsx:638]

    IF no pendingPlayers or no pendingMatches: return

    # Repopulate game results (clear then refill)
    processed = repopulateGameResults(pendingPlayers, pendingMatches, 31)

    # Calculate new ratings
    calculated = calculateRatings(processed, pendingMatches)

    # Update UI and storage
    setPlayers(calculated)
    saveToLocalStorage(calculated)

    # Reset error state
    setPendingPlayers(null)
    setPendingMatches(null)
    setWalkthroughErrors([])
    setIsRecalculating(false)
```

## Step 4: repopulateGameResults()

```
FUNCTION repopulateGameResults(players, matches, numRounds):
    # [hashUtils.ts:757]

    # Clear all game results
    playersCopy = each player with empty gameResults array

    resultIndex = 0

    FOR each match in matches:
        p1 = players[match.player1 - 1]
        p2 = players[match.player2 - 1]

        IF invalid indices: continue

        # Convert score codes to strings (0=O, 1=L, 2=D, 3=W)
        result1 = resultCodeToString(match.score1)
        result2 = resultCodeToString(match.score2)

        IF result1 exists: p1.gameResults[resultIndex] = result1 + "_"
        IF result2 exists: p2.gameResults[resultIndex] = result2 + "_"

        resultIndex++

    RETURN playersCopy
```

## Step 5: calculateRatings() - Elo Calculation

```
FUNCTION calculateRatings(players, matches):
    # [hashUtils.ts:709]

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
        expectedP1 = formula(p1Rating, p2Rating)  # [hashUtils.ts:90]
        expectedP2 = formula(p2Rating, p1Rating)

        # Determine actual scores from match result
        IF score1 == 1 (loss):   actualP1 = 0, actualP2 = 1
        ELSE IF score1 == 3 (win): actualP1 = 1, actualP2 = 0
        ELSE:                     actualP1 = 0.5, actualP2 = 0.5 (draw)

        # Apply Elo formula: newRating = old + K * (actual - expected)
        p1NewRating = round(p1Rating + EloK * (actualP1 - expectedP1))
        p2NewRating = round(p2Rating + EloK * (actualP2 - expectedP2))

        p1.nRating = max(0, p1NewRating)
        p2.nRating = max(0, p2NewRating)

    RETURN playersCopy
```

## Elo Formula

```
FUNCTION formula(myRating, opponentsRating):
    # [hashUtils.ts:90]
    RETURN 1 / (1 + 10 ** ((abs(opponentsRating) - abs(myRating)) / 400))
```
