import { useState, useEffect, useRef } from "react";
import type { PlayerData, ValidationResult } from "../utils/hashUtils";
import {
  processGameResults,
  calculateRatings,
  repopulateGameResults,
  updatePlayerGameData,
} from "../utils/hashUtils";
import ErrorDialog from "./ErrorDialog";
import { Settings as SettingsIcon, Play as PlayIcon } from "lucide-react";
import "../css/index.css";

export const loadSampleData = () => {
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const firstNames = [
    "John",
    "Jane",
    "Robert",
    "Emily",
    "Michael",
    "Sarah",
    "David",
    "Lisa",
    "James",
    "Anna",
    "Thomas",
    "Maria",
    "Daniel",
    "Jennifer",
  ];

  const lastNames = [
    "Johnson",
    "Smith",
    "Williams",
    "Brown",
    "Davis",
    "Garcia",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
  ];

  const groupCodes = ["A1", "B", "C", "D", "E", ""];

  // Fixed permutation for consistent sample data
  const shuffledRanks = [7, 2, 14, 5, 10, 1, 13, 8, 3, 12, 6, 11, 4, 9];

  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const getRandomRank = (
    min: number,
    max: number,
    excluded: number[],
    seed: number,
  ) => {
    const candidates = [];
    for (let i = min; i <= max; i++) {
      if (!excluded.includes(i)) candidates.push(i);
    }
    if (candidates.length === 0) return 1;
    const idx = Math.floor(pseudoRandom(seed) * candidates.length);
    return candidates[idx];
  };

  return ranks.map((rank: number) => {
    const index = shuffledRanks.indexOf(rank);
    const pseudoRandom2 = (seed: number) => pseudoRandom(seed + index * 100);

    // Random number of games (2-5 rounds)
    const numGames = 2 + Math.floor(pseudoRandom2(index * 10) * 4);
    const gameResults: (string | null)[] = Array(31).fill(null);

    const excluded: number[] = [];

    for (let i = 0; i < numGames; i++) {
      // Randomly choose 2-player or 4-player game
      const is4Player = pseudoRandom2(index * 10 + i * 3) > 0.5;

      // Generate opponent ranks (avoid duplicates)
      const opp1 = getRandomRank(1, 14, excluded, index * 10 + i * 5);
      excluded.push(opp1);

      if (is4Player) {
        // 4-player: need 3 more opponents (players 2, 3, 4)
        const opp2 = getRandomRank(1, 14, excluded, index * 10 + i * 7);
        excluded.push(opp2);

        const opp3 = getRandomRank(1, 14, excluded, index * 10 + i * 9);
        excluded.push(opp3);

        const opp4 = getRandomRank(1, 14, excluded, index * 10 + i * 10);
        excluded.push(opp4);

        // Generate result (W, L, or D) for each pair
        // Format: opp1:opp2Wopp3:opp4 (first pair vs second pair)
        const result1 = ["W", "L", "D"][
          Math.floor(pseudoRandom2(index * 10 + i * 11) * 3)
        ];
        const result2 = ["W", "L", "D"][
          Math.floor(pseudoRandom2(index * 10 + i * 13) * 3)
        ];

        gameResults[i] = `${opp1}:${opp2}${result1}${result2}${opp3}:${opp4}`;
      } else {
        const opp2 = getRandomRank(1, 14, excluded, index * 10 + i * 7);
        excluded.push(opp2);

        // Generate result
        const result = ["W", "L", "D"][
          Math.floor(pseudoRandom2(index * 10 + i * 11) * 3)
        ];
        gameResults[i] = `${opp1}${result}${opp2}`;
      }
    }

    return {
      rank,
      group: groupCodes[index % groupCodes.length],
      lastName: lastNames[index],
      firstName: firstNames[index],
      rating: 1000 + Math.floor(pseudoRandom2(index * 17) * 400),
      nRating: 1000 + Math.floor(pseudoRandom2(index * 31) * 400),
      grade: `${(index % 7) + 1}th`,
      games: numGames,
      attendance: numGames,
      info: "",
      phone: "",
      school: "",
      room: "",
      gameResults,
    };
  });
};

interface LadderFormProps {
  setShowSettings?: (show: boolean) => void;
  triggerWalkthrough?: boolean;
  setTriggerWalkthrough?: (show: boolean) => void;
  onSetRecalculateRef?: (ref: () => void) => void;
}

export default function LadderForm({
  setShowSettings,
  triggerWalkthrough,
  setTriggerWalkthrough,
  onSetRecalculateRef,
}: LadderFormProps = {}) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isWide, setIsWide] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<
    "rank" | "nRating" | "rating" | "byName" | null
  >(null);
  const [hasData, setHasData] = useState(false);
  const [projectName, setProjectName] = useState<string>(
    "Bughouse Chess Ladder",
  );
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [currentError, setCurrentError] = useState<ValidationResult | null>(
    null,
  );
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isWalkthrough, setIsWalkthrough] = useState(false);
  const [walkthroughErrors, setWalkthroughErrors] = useState<
    ValidationResult[]
  >([]);
  const [walkthroughIndex, setWalkthroughIndex] = useState<number>(0);
  const [pendingPlayers, setPendingPlayers] = useState<PlayerData[] | null>(
    null,
  );
  const [pendingMatches, setPendingMatches] = useState<any[] | null>(null);
  const [entryCell, setEntryCell] = useState<{
    playerRank: number;
    round: number;
  } | null>(null);
  const [tempGameResult, setTempGameResult] = useState<{
    playerRank: number;
    round: number;
    resultString: string;
    parsedPlayer1Rank: number;
    parsedPlayer2Rank: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (triggerWalkthrough && setTriggerWalkthrough) {
      setTriggerWalkthrough(false);
      setIsWalkthrough(true);
      // Reset isRecalculating when starting walkthrough
      setIsRecalculating(false);
      setWalkthroughIndex(0);
      // Set entryCell to first non-blank cell for highlighting
      const cells = getNonBlankCells();
      if (cells.length > 0) {
        setEntryCell({
          playerRank: cells[0].playerRank,
          round: cells[0].round,
        });
      }
    }
  }, [triggerWalkthrough, setTriggerWalkthrough]);

  // VB6 Line: 894 - Initialize with sample data
  useEffect(() => {
    const savedPlayers = localStorage.getItem("ladder_players");
    if (savedPlayers) {
      try {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const playersWithResults = parsed.map((player) => ({
            ...player,
            gameResults: player.gameResults || new Array(31).fill(null),
          }));
          setPlayers(playersWithResults);
          setHasData(true);
          setSortBy(null);
          console.log(
            `[LadderForm] Loaded ${playersWithResults.length} players from localStorage`,
          );
          return;
        }
      } catch (err) {
        console.error("Failed to parse players:", err);
      }
    }
    const samplePlayers = loadSampleData();
    console.log(
      `[LadderForm] Loaded ${samplePlayers.length} players from sample data`,
    );
    samplePlayers.forEach((player) => {
      console.log(
        `[LadderForm] Sample player: Rank=${player.rank}, Name=${player.firstName} ${player.lastName}, Rating=${player.rating}, Games=${player.games}`,
      );
    });

    setPlayers(samplePlayers);
    setHasData(false);
    setSortBy(null);
  }, []);

  const loadPlayers = (file?: File) => {
    const fileToLoad = file || lastFile;

    if (!fileToLoad) {
      return;
    }

    console.log(`[LadderForm] Loading file: ${fileToLoad.name}`);
    const projectName = fileToLoad.name.replace(/\.[^.]+$/, "");
    setProjectName(projectName);
    setLastFile(fileToLoad);
    setHasData(false);
    setSortBy(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      let loadedPlayers: PlayerData[] = [];
      const allGameResults: (string | null)[][] = [];
      const numRounds = 31;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue;

        if (line.startsWith("Group")) continue;

        let cols = line.split("\t");
        if (cols[0].length > 2) {
          // if (line.startsWith('\t')){
          //             console.log('adding leading space to line:', line);
          cols.unshift(" ");
        }
        //if (parts.length < 14) continue;  // Need at least columns 0-13

        // const lastChar = cols[cols.length - 1];
        // const hasTail = lastChar === '' ? cols.length - 1 : cols.length;

        const player: PlayerData = {
          rank: cols[4] ? parseInt(cols[4]) : 0,
          group: cols[0] && cols[0].trim() !== "" ? cols[0].trim() : "",
          lastName: cols[1] !== null ? cols[1] : "",
          firstName: cols[2] !== null ? cols[2] : "",
          rating: cols[3] ? parseInt(String(cols[3]).trim() || "-1") : -1,
          nRating: 0,
          grade: cols[6] !== null ? cols[6] : "N/A",
          games: cols[7] !== null ? parseInt(cols[7]) : 0,
          attendance: cols[8] !== null ? parseInt(cols[8]) : 0,
          phone: cols[9] !== null ? cols[9] : "",
          info: cols[10] !== null ? cols[10] : "",
          school: cols[11] !== null ? cols[11] : "",
          room: cols[12] !== null ? cols[12] : "",
          gameResults: [],
        };

        if (
          parseInt(String(player.rank)) > 0 &&
          (player.lastName || player.firstName || player.nRating !== 0)
        ) {
          loadedPlayers.push(player);
        }

        const gameResults: (string | null)[] = [];
        for (let g = 0; g < numRounds; g++) {
          gameResults.push(cols[13 + g]);
        }
        player.gameResults = gameResults;
      }

      // Max 200 players limit
      if (loadedPlayers.length > 200) {
        loadedPlayers = loadedPlayers.slice(0, 200);
      }

      if (loadedPlayers.length > 0) {
        const numRounds = 31;
        localStorage.clear();
        setHasData(true);

        if (sortBy === "rank") {
          loadedPlayers.sort((a, b) => a.rank - b.rank);
        } else if (sortBy === "nRating") {
          loadedPlayers.sort((a, b) => {
            const ratingA = a.nRating || 0;
            const ratingB = b.nRating || 0;
            if (ratingA !== ratingB) {
              return ratingB - ratingA;
            }
            return a.rank - b.rank;
          });
        } else if (sortBy === "rating") {
          loadedPlayers.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (ratingA !== ratingB) {
              return ratingB - ratingA;
            }
            return a.rank - b.rank;
          });
        } else if (sortBy === "byName") {
          loadedPlayers.sort((a, b) => Chess_Compare(a, b, "last", 0));
        }

        const sortedGameResults: (string | null)[][] = [];

        loadedPlayers.forEach((player) => {
          const gameResults: (string | null)[] = [];
          for (let g = 0; g < numRounds; g++) {
            gameResults.push(allGameResults[player.rank - 1]?.[g] || null);
          }
          const playerIndex = loadedPlayers.indexOf(player);
          sortedGameResults[playerIndex] = gameResults;
        });

        localStorage.setItem("ladder_players", JSON.stringify(loadedPlayers));
        setPlayers(loadedPlayers);
        setHasData(true);
        setSortBy(null);
      } else {
      }
    };

    reader.readAsText(fileToLoad);
  };

  const recalculateRatings = () => {
    console.log(
      `>>> [BUTTON PRESSED] Recalculate Ratings - ${players.length} players`,
    );
    if (players.length === 0) {
      console.error("No players to process");
      return;
    }

    console.log("Starting rating calculation with VB6-style validation");
    console.log(`Processing ${players.length} players`);

    const { matches, hasErrors, errorCount, errors } = processGameResults(
      players,
      31,
    );
    console.log(`Validated ${matches.length} matches, errors: ${errorCount}`);

    if (hasErrors && errors.length > 0) {
      console.warn("Errors detected. Opening dialog for correction.");
      setIsRecalculating(true);
      setPendingPlayers(players);
      setPendingMatches(matches);
      setCurrentError(errors[0]);
      setEntryCell({
        playerRank: errors[0].playerRank,
        round: errors[0].resultIndex,
      });
      setWalkthroughErrors(errors);
      setWalkthroughIndex(0);
    } else {
      console.log("No errors. Clearing and repopulating game results.");
      setIsRecalculating(false);
      const processedPlayers = repopulateGameResults(players, matches, 31);
      const calculatedPlayers = calculateRatings(processedPlayers, matches);
      setPlayers(calculatedPlayers);
      localStorage.setItem("ladder_players", JSON.stringify(calculatedPlayers));
      console.log("Rating calculation complete");
    }
  };

  useEffect(() => {
    if (onSetRecalculateRef) {
      onSetRecalculateRef(recalculateRatings);
    }
  }, [onSetRecalculateRef, recalculateRatings]);

  const countNonBlankRounds = (): number => {
    let count = 0;
    for (const player of players) {
      const gameResults = player.gameResults || [];
      for (const result of gameResults) {
        if (result && result.trim() !== "") {
          count++;
        }
      }
    }
    return count;
  };

  const handleCorrectionSubmit = (correctedString: string) => {
    // In walkthrough mode, handle clearing cells without pendingPlayers
    if (isWalkthrough && entryCell) {
      if (!correctedString.trim()) {
        // Clear the cell in players data
        const updatedPlayers = players.map((p) => ({ ...p }));
        const playerIdx = entryCell.playerRank - 1;
        if (playerIdx >= 0 && playerIdx < updatedPlayers.length) {
          const player = updatedPlayers[playerIdx];
          if (player) {
            const newGameResults = [...(player.gameResults || [])];
            newGameResults[entryCell.round] = "";
            player.gameResults = newGameResults;
          }
        }
        setPlayers(updatedPlayers);

        // Advance to next cell or close dialog
        if (walkthroughIndex < getNonBlankCells().length - 1) {
          const newIndex = walkthroughIndex + 1;
          setWalkthroughIndex(newIndex);
          const cell = getNonBlankCells()[newIndex];
          if (cell) {
            setEntryCell({ playerRank: cell.playerRank, round: cell.round });
          }
        } else {
          setIsWalkthrough(false);
        }
      }
      return;
    }

    if (!pendingPlayers || !pendingMatches) return;
    // In recalculate mode, use entryCell or walkthroughErrors since currentError is null
    if (!currentError && !entryCell) return;

    // Handle empty string from "Clear Cell" - treat as valid (no result)
    if (!correctedString.trim()) {
      const updatedPlayers = players.map((p) => ({ ...p }));
      const pendingUpdatedPlayers = pendingPlayers.map((p) => ({ ...p }));

      // Update the cell where the error was detected (entryCell)
      if (entryCell) {
        const playerIdx = entryCell.playerRank - 1;
        if (playerIdx >= 0 && playerIdx < updatedPlayers.length) {
          const player = updatedPlayers[playerIdx];
          const pendingPlayer = pendingUpdatedPlayers[playerIdx];
          if (player && pendingPlayer) {
            const newGameResults = [...player.gameResults];
            const newPendingGameResults = [...pendingPlayer.gameResults];
            newGameResults[entryCell.round] = "";
            newPendingGameResults[entryCell.round] = "";
            player.gameResults = newGameResults;
            pendingPlayer.gameResults = newPendingGameResults;
          }
        }
      }

      setPlayers(updatedPlayers);
      setPendingPlayers(pendingUpdatedPlayers);

      // Remove this error from the walkthrough errors list
      const newWalkthroughErrors = walkthroughErrors.filter(
        (error) =>
          !(
            error.playerRank === entryCell?.playerRank &&
            error.resultIndex === entryCell?.round
          ),
      );
      setWalkthroughErrors(newWalkthroughErrors);

      if (newWalkthroughErrors.length > 0) {
        // Find position of current error in original list, then use same index in filtered list
        let currentIndex = -1;
        for (let i = 0; i < walkthroughErrors.length; i++) {
          if (
            walkthroughErrors[i].playerRank === entryCell?.playerRank &&
            walkthroughErrors[i].resultIndex === entryCell?.round
          ) {
            currentIndex = i;
            break;
          }
        }

        // Use currentIndex (or 0 if we're at the end) as the new index in filtered list
        const newIndex =
          currentIndex < newWalkthroughErrors.length
            ? currentIndex
            : newWalkthroughErrors.length - 1;

        const nextError = newWalkthroughErrors[newIndex];
        if (nextError) {
          setWalkthroughIndex(newIndex);
          setCurrentError(nextError);
          setEntryCell({
            playerRank: nextError.playerRank,
            round: nextError.resultIndex,
          });
        } else {
          completeRatingCalculation();
        }
      } else {
        completeRatingCalculation();
      }
      return;
    }

    const validation = updatePlayerGameData(correctedString, true);

    if (!validation.isValid) {
      alert(`Invalid format. Error code: ${Math.abs(validation.error || 10)}`);
      return;
    }

    const updatedPlayers = players.map((p) => ({ ...p }));
    const pendingUpdatedPlayers = pendingPlayers.map((p) => ({ ...p }));

    // Update the cell where the error was detected (entryCell)
    if (entryCell) {
      const playerIdx = entryCell.playerRank - 1;
      if (playerIdx >= 0 && playerIdx < updatedPlayers.length) {
        const player = updatedPlayers[playerIdx];
        const pendingPlayer = pendingUpdatedPlayers[playerIdx];
        if (player && pendingPlayer) {
          const newGameResults = [...player.gameResults];
          const newPendingGameResults = [...pendingPlayer.gameResults];
          newGameResults[entryCell.round] = correctedString + "_";
          newPendingGameResults[entryCell.round] = correctedString + "_";
          player.gameResults = newGameResults;
          pendingPlayer.gameResults = newPendingGameResults;
        }
      }
    }

    // Remove this error from the walkthrough errors list
    const currentResultIndex = entryCell?.round ?? -1;
    const newWalkthroughErrors = walkthroughErrors.filter(
      (error) => error.resultIndex !== currentResultIndex,
    );

    setPlayers(updatedPlayers);
    setPendingPlayers(pendingUpdatedPlayers);
    setCurrentError(null);
    setWalkthroughErrors(newWalkthroughErrors);
    // setEntryCell(null); // Removed to maintain highlighting during recalculation
    // After correction: move to next error or complete if recalculation mode
    if (isRecalculating) {
      if (newWalkthroughErrors.length > 0) {
        const nextError = newWalkthroughErrors[walkthroughIndex];
        if (nextError) {
          setWalkthroughIndex(walkthroughIndex);
          setEntryCell({
            playerRank: nextError.playerRank,
            round: nextError.resultIndex,
          });
        } else {
          completeRatingCalculation();
        }
      } else {
        completeRatingCalculation();
      }
    } else if (newWalkthroughErrors.length === 0) {
      completeRatingCalculation();
    }
  };

  const handleCorrectionCancel = () => {
    console.log(">>> [BUTTON PRESSED] Cancel");
    setCurrentError(null);
    setIsRecalculating(false);
    setPendingPlayers(null);
    setPendingMatches(null);
    setWalkthroughErrors([]);
    setWalkthroughIndex(0);
    setEntryCell(null);
    setTempGameResult(null);
  };

  const completeRatingCalculation = () => {
    if (!pendingPlayers || !pendingMatches) return;

    const processedPlayers = repopulateGameResults(
      pendingPlayers,
      pendingMatches,
      31,
    );
    const calculatedPlayers = calculateRatings(
      processedPlayers,
      pendingMatches,
    );
    setPlayers(calculatedPlayers);
    localStorage.setItem("ladder_players", JSON.stringify(calculatedPlayers));
    setPendingPlayers(null);
    setPendingMatches(null);
    setWalkthroughErrors([]);
    setWalkthroughIndex(0);
    setCurrentError(null);
    setEntryCell(null);
    setIsRecalculating(false);
    console.log("Rating calculation complete");
  };

  const handleWalkthroughNext = () => {
    if (walkthroughIndex < walkthroughErrors.length - 1) {
      setWalkthroughIndex(walkthroughIndex + 1);
      setEntryCell({
        playerRank: walkthroughErrors[walkthroughIndex + 1]?.playerRank,
        round: walkthroughErrors[walkthroughIndex + 1]?.resultIndex,
      });
    } else {
      completeRatingCalculation();
    }
  };

  const handleWalkthroughPrev = () => {
    if (walkthroughIndex > 0) {
      setWalkthroughIndex(walkthroughIndex - 1);
    }
  };

  const getNonBlankCells = (): { playerRank: number; round: number }[] => {
    const cells: { playerRank: number; round: number }[] = [];
    for (let playerIdx = 0; playerIdx < players.length; playerIdx++) {
      const gameResults = players[playerIdx]?.gameResults ?? [];
      if (gameResults.length === 0) continue;
      for (let roundIdx = 0; roundIdx < gameResults.length; roundIdx++) {
        const result = gameResults[roundIdx];
        if (result != null && result.trim() !== "") {
          cells.push({ playerRank: playerIdx + 1, round: roundIdx });
        }
      }
    }
    return cells;
  };

  const handleWalkthroughNextForReview = () => {
    if (isWalkthrough && walkthroughIndex < getNonBlankCells().length - 1) {
      const newIndex = walkthroughIndex + 1;
      setWalkthroughIndex(newIndex);
      // Update entryCell to highlight the new cell
      const cell = getNonBlankCells()[newIndex];
      if (cell) {
        setEntryCell({ playerRank: cell.playerRank, round: cell.round });
      }
    } else {
      setIsWalkthrough(false);
    }
  };

  const handleWalkthroughPrevForReview = () => {
    if (isWalkthrough && walkthroughIndex > 0) {
      const newIndex = walkthroughIndex - 1;
      setWalkthroughIndex(newIndex);
      // Update entryCell to highlight the new cell
      const cell = getNonBlankCells()[newIndex];
      if (cell) {
        setEntryCell({ playerRank: cell.playerRank, round: cell.round });
      }
    }
  };

  const handleGameEntrySubmit = (correctedString: string) => {
    if (!entryCell) return;

    const parsedResult = updatePlayerGameData(
      correctedString.replace(/_$/, ""),
      true,
    );

    if (parsedResult.isValid) {
      setPlayers((prevPlayers) => {
        const updatedPlayers = [...prevPlayers];
        const playerIndex = entryCell.playerRank - 1;
        if (playerIndex >= 0 && playerIndex < updatedPlayers.length) {
          const player = updatedPlayers[playerIndex];
          if (player) {
            const newGameResults = [...player.gameResults];
            newGameResults[entryCell.round] =
              parsedResult.resultString || correctedString;
            player.gameResults = newGameResults;
          }
        }
        localStorage.setItem("ladder_players", JSON.stringify(updatedPlayers));
        return updatedPlayers;
      });
    }

    // Check for pending paste results and continue filling cells
    const pasteResults = (window as any)?.__pasteResults;
    if (
      pasteResults &&
      Array.isArray(pasteResults) &&
      pasteResults.length > 1
    ) {
      console.log(
        `>>> [PASTE CONTINUE] ${pasteResults.length - 1} results remaining`,
      );

      // Remove first result (just used)
      const remaining = pasteResults.slice(1);
      (window as any).__pasteResults = remaining;

      // Find next empty cell starting from current position
      let foundCell: { playerRank: number; round: number } | null = null;
      const startRank = entryCell.playerRank;
      const startRound = entryCell.round + 1;

      for (let rank = startRank; rank <= players.length; rank++) {
        const player = players[rank - 1];
        if (!player) continue;

        // If this is the starting rank, start from next round
        const startR = rank === startRank ? startRound : 0;

        for (let round = startR; round < 31; round++) {
          const cellValue = player.gameResults[round];
          if (!cellValue || cellValue.trim() === "") {
            foundCell = { playerRank: rank, round };
            console.log(
              `>>> [PASTE CONTINUE] Found empty cell at Rank ${rank}, Round ${round + 1}`,
            );
            break;
          }
        }
        if (foundCell) break;
      }

      // If no more cells found from current position, search from beginning
      if (!foundCell) {
        for (let rank = 1; rank <= players.length; rank++) {
          const player = players[rank - 1];
          if (!player) continue;

          for (let round = 0; round < 31; round++) {
            const cellValue = player.gameResults[round];
            if (!cellValue || cellValue.trim() === "") {
              foundCell = { playerRank: rank, round };
              console.log(
                `>>> [PASTE CONTINUE] Found empty cell at Rank ${rank}, Round ${round + 1}`,
              );
              break;
            }
          }
          if (foundCell) break;
        }
      }

      // Open dialog for next cell with next result
      if (foundCell && remaining.length > 0) {
        // Don't clear entryCell yet - will open next cell after brief delay
        setTimeout(() => {
          setEntryCell(null);
          setTempGameResult(null);
          setEntryCell(foundCell);
          setTempGameResult({
            playerRank: foundCell.playerRank,
            round: foundCell.round,
            resultString: remaining[0],
            parsedPlayer1Rank: 0,
            parsedPlayer2Rank: 0,
          });
          console.log(
            `>>> [PASTE CONTINUE] Opening cell with result: "${remaining[0]}"`,
          );
        }, 100);
        return;
      } else {
        // No more empty cells or results - clear the queue
        (window as any).__pasteResults = undefined;
        console.log(`>>> [PASTE CONTINUE] All results pasted!`);
      }
    } else {
      (window as any).__pasteResults = undefined;
    }

    setEntryCell(null);
    setTempGameResult(null);
  };

  const handleUpdatePlayerData = (
    playerRank: number,
    roundIndex: number,
    resultString: string,
  ) => {
    const parsedResult = updatePlayerGameData(
      resultString.replace(/_$/, ""),
      true,
    );
    if (parsedResult.isValid) {
      setTempGameResult({
        playerRank,
        round: roundIndex,
        resultString: parsedResult.resultString || resultString,
        parsedPlayer1Rank: parsedResult.parsedPlayer1Rank || 0,
        parsedPlayer2Rank: parsedResult.parsedPlayer2Rank || 0,
      });
    }
  };

  const Chess_Compare = (
    Row1: PlayerData,
    Row2: PlayerData,
    sortType: "last" | "first",
    _col_sel: number,
  ) => {
    const result1 = sortType === "last" ? Row1.lastName : Row1.firstName;
    const result2 = sortType === "last" ? Row2.lastName : Row2.firstName;

    if (result1 === "" || result1 === null) {
      return 1;
    }

    if (result2 === "" || result2 === null) {
      return -1;
    }

    if (result1 > result2) {
      return 1;
    }

    if (result1 < result2) {
      return -1;
    }

    return 0;
  };

  const handleSort = (sortMethod: "rank" | "nRating" | "rating" | "byName") => {
    setSortBy(sortMethod);
    setHasData(true);

    const playersWithResults = players.map((player) => ({
      ...player,
      gameResults: player.gameResults || new Array(31).fill(null),
    }));

    playersWithResults.sort((a, b) => {
      if (sortMethod === "rank") {
        return a.rank - b.rank;
      } else if (sortMethod === "nRating") {
        const ratingA = a.nRating || 0;
        const ratingB = b.nRating || 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA;
        }
        return a.rank - b.rank;
      } else if (sortMethod === "rating") {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA;
        }
        return a.rank - b.rank;
      } else if (sortMethod === "byName") {
        const resultA = a.lastName || a.firstName;
        const resultB = b.lastName || b.firstName;
        if (resultA && !resultB) return 1;
        if (!resultA && resultB) return -1;
        if (!resultA && !resultB) return 0;
        if (resultA < resultB) return -1;
        if (resultA > resultB) return 1;
        return 0;
      }
      return 0;
    });

    const sortedPlayers = playersWithResults.map((item, index) => {
      item.rank = index + 1;
      return item;
    });

    setPlayers(sortedPlayers);
    localStorage.setItem("ladder_players", JSON.stringify(sortedPlayers));
  };
  const saveLocalStorage = () => {
    if (players.length === 0) return;
    try {
      localStorage.setItem("ladder_players", JSON.stringify(players));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  };

  const exportPlayers = () => {
    console.log(`>>> [BUTTON PRESSED] Export - ${players.length} players`);
    if (players.length === 0) {
      console.error("No players to export");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `Export_Results_${timestamp}.tab`;

    const headerLine =
      "Group\tLast Name\tFirst Name\tRating\tRnk\tN Rate\tGr\tX\tPhone\tInfo\tSchool\tRoom\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14\t15\t16\t17\t18\t19\t20\t21\t22\t23\t24\t25\t26\t27\t28\t29\t30\t31\Version 1.21";

    let output = headerLine + "\n";

    players.forEach((player) => {
      const gameResults = player.gameResults || new Array(31).fill(null);

      output += `${player.group || ""}\t${player.lastName || ""}\t${player.firstName || ""}\t${player.rating || ""}\t${player.rank}\t${player.nRating || ""}\t${player.grade || ""}\t${player.games || 0}\t${player.attendance || ""}\t${player.phone || ""}\t${player.info || ""}\t${player.school || ""}\t${player.room || ""}`;

      output += gameResults.map((r) => r || "").join("\t");
      output += "\n";
    });

    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Exported ${players.length} players to ${filename}`);
  };

  if (!players || players.length === 0) {
    return (
      <div style={{ padding: "2rem", color: "#64748b" }}>
        <h1>{projectName}</h1>
        <p>Loading sample data...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
          color: "white",
          padding: "1rem 2rem",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1>{projectName} v1.0.0</h1>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <span
              style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.7)" }}
            >
              Total Players
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>
              {players.length}
            </div>
          </div>
          {setShowSettings && (
            <button
              onClick={() => {
                console.log(">>> [BUTTON PRESSED] Settings");
                setShowSettings(true);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                padding: "0.5rem 1rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <SettingsIcon size={18} />
              Settings
            </button>
          )}
          <button
            onClick={() => handleSort("rank")}
            style={{
              background: sortBy === "rank" && hasData ? "#8b5cf6" : "#6b7280",
              color: "white",
              border: "1px solid #4b5563",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              outline: "2px solid transparent",
              outlineOffset: "2px",
              fontWeight: sortBy === "rank" && hasData ? "600" : "400",
            }}
          >
            Sort by Rank
          </button>
          <button
            onClick={() => handleSort("byName")}
            style={{
              background:
                sortBy === "byName" && hasData ? "#8b5cf6" : "#6b7280",
              color: "white",
              border: "1px solid #4b5563",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              outline: "2px solid transparent",
              outlineOffset: "2px",
              fontWeight: sortBy === "byName" && hasData ? "600" : "400",
            }}
          >
            Sort by Name
          </button>
          <button
            onClick={() => handleSort("nRating")}
            style={{
              background:
                sortBy === "nRating" && hasData ? "#8b5cf6" : "#6b7280",
              color: "white",
              border: "1px solid #4b5563",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              outline: "2px solid transparent",
              outlineOffset: "2px",
              fontWeight: sortBy === "nRating" && hasData ? "600" : "400",
            }}
          >
            Sort by New Rating
          </button>
          <button
            onClick={() => handleSort("rating")}
            style={{
              background:
                sortBy === "rating" && hasData ? "#8b5cf6" : "#6b7280",
              color: "white",
              border: "1px solid #4b5563",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              outline: "2px solid transparent",
              outlineOffset: "2px",
              fontWeight: sortBy === "rating" && hasData ? "600" : "400",
            }}
          >
            Sort by Previous Rating
          </button>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            background: "#10b981",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
            display: "inline-block",
          }}
        >
          Load
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.tab,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLastFile(file);
                loadPlayers(file);
              }
            }}
          />
        </label>

        <button
          style={{
            background: "#f59e0b",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
          onClick={saveLocalStorage}
        >
          Save
        </button>

        <button
          style={{
            background: "#8b5cf6",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
          onClick={recalculateRatings}
        >
          Recalculate Ratings
        </button>

        <button
          style={{
            background: "white",
            color: "black",
            border: "1px solid #cbd5e1",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
          onClick={() => setIsWide(!isWide)}
        >
          Zoom: {isWide ? "140%" : "100%"}
        </button>

        <button
          style={{
            background: isAdmin ? "#ef4444" : "white",
            color: isAdmin ? "white" : "black",
            border: "1px solid #cbd5e1",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
          onClick={() => setIsAdmin(!isAdmin)}
        >
          {isAdmin ? "Exit Admin" : "Admin Mode"}
        </button>
        <button
          onClick={exportPlayers}
          style={{
            background: "#3b82f6",
            color: "white",
            border: "1px solid #1d4ed8",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
          }}
        >
          <PlayIcon size={18} />
          Export
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#f8fafc",
          borderRadius: "0.5rem",
        }}
      />

      <div
        style={{
          overflow: "auto",
          border: "1px solid #cbd5e1",
          borderRadius: "0.5rem",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr>
              <th
                key="head-rank"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                Rnk
              </th>
              <th
                key="head-group"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                Group
              </th>
              <th
                key="head-lastName"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                Last Name
              </th>
              <th
                key="head-firstName"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                First Name
              </th>
              <th
                key="head-rating"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                Previous Rating
              </th>
              <th
                key="head-nRating"
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  fontWeight: "500",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "#0f172a",
                  color: "white",
                }}
              >
                New Rating
              </th>
              {Array.from({ length: 31 }).map((_, round) => (
                <th
                  key={`head-round-${round}`}
                  style={{
                    padding: "0.5rem 0.75rem",
                    textAlign: "center",
                    fontWeight: "500",
                    borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "#0f172a",
                    color: "white",
                  }}
                >
                  Round {round + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player, rowIndex) => {
              const gameResults =
                player.gameResults || new Array(31).fill(null);

              return (
                <tr
                  key={player.rank}
                  style={{
                    backgroundColor:
                      rowIndex % 2 >= 1 ? "#f8fafc" : "transparent",
                  }}
                >
                  {Object.keys(player)
                    .filter((_, i) => i < 6)
                    .map((field, col) => {
                      const isEditable = isAdmin && field !== "rank";
                      return (
                        <td
                          key={`${rowIndex}-${col}`}
                          contentEditable={isEditable}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => {
                            if (isEditable && e.target.textContent) {
                              const value = e.target.textContent;
                              setPlayers((prevPlayers) => {
                                const updatedPlayers = [...prevPlayers];
                                const index = player.rank - 1;
                                if (updatedPlayers[index]) {
                                  switch (field) {
                                    case "group":
                                      updatedPlayers[index].group = value;
                                      break;
                                    case "lastName":
                                      updatedPlayers[index].lastName = value;
                                      break;
                                    case "firstName":
                                      updatedPlayers[index].firstName = value;
                                      break;
                                    case "rating":
                                      updatedPlayers[index].rating =
                                        parseInt(value) || 0;
                                      break;
                                    case "nRating":
                                      updatedPlayers[index].nRating =
                                        parseInt(value) || 0;
                                      break;
                                  }
                                }
                                return updatedPlayers;
                              });
                              localStorage.setItem(
                                "ladder_players",
                                JSON.stringify(
                                  players.map((p, i) =>
                                    i === player.rank - 1
                                      ? ({
                                          ...p,
                                          [field]:
                                            field === "rating" ||
                                            field === "nRating"
                                              ? parseInt(e.target.textContent)
                                              : e.target.textContent,
                                        } as any)
                                      : p,
                                  ),
                                ),
                              );
                            }
                          }}
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "middle",
                            borderRight: "1px solid #e2e8f0",
                            backgroundColor:
                              rowIndex % 2 >= 1 ? "#f8fafc" : "transparent",
                          }}
                        >
                          {field === "rank" && player.rank}
                          {field === "group" && player.group}
                          {field === "lastName" && player.lastName}
                          {field === "firstName" && player.firstName}
                          {field === "rating" && player.rating !== undefined
                            ? player.rating
                            : ""}
                          {field === "nRating" && player.nRating !== undefined
                            ? player.nRating
                            : ""}
                        </td>
                      );
                    })}
                  {gameResults.map((result, gCol) => {
                    const isEditable = isAdmin;
                    return (
                      <td
                        key={`game-${player.rank}-${gCol}`}
                        contentEditable={isEditable}
                        suppressContentEditableWarning={true}
                        onClick={() => {
                          if (!isAdmin) {
                            setEntryCell({
                              playerRank: player.rank,
                              round: gCol,
                            });
                          }
                        }}
                        onBlur={(e) => {
                          if (isEditable && e.target.textContent) {
                            const value = e.target.textContent;
                            setPlayers((prevPlayers) => {
                              const updatedPlayers = [...prevPlayers];
                              const index = player.rank - 1;
                              if (updatedPlayers[index]) {
                                const newGameResults = [
                                  ...updatedPlayers[index].gameResults,
                                ];
                                newGameResults[gCol] = value;
                                updatedPlayers[index] = {
                                  ...updatedPlayers[index],
                                  gameResults: newGameResults,
                                };
                              }
                              return updatedPlayers;
                            });
                          }
                        }}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "middle",
                          borderRight: "1px solid #e2e8f0",
                          backgroundColor:
                            entryCell &&
                            entryCell.playerRank === player.rank &&
                            entryCell.round === gCol
                              ? "#fef3c7"
                              : rowIndex % 2 >= 1
                                ? "#f8fafc"
                                : "transparent",
                          fontSize: "0.75rem",
                          cursor: isAdmin ? "default" : "pointer",
                          borderColor:
                            entryCell &&
                            entryCell.playerRank === player.rank &&
                            entryCell.round === gCol
                              ? "#f59e0b"
                              : tempGameResult &&
                                  tempGameResult.playerRank === player.rank &&
                                  tempGameResult.round === gCol
                                ? "#3b82f6"
                                : "#e2e8f0",
                        }}
                      >
                        {result ? result : ""}
                        {tempGameResult &&
                        tempGameResult.playerRank === player.rank &&
                        tempGameResult.round === gCol
                          ? tempGameResult.resultString
                          : ""}
                      </td>
                    );
                  })}
                  {Array.from({
                    length: Math.max(0, 20 - gameResults.length),
                  }).map((_, emptyCol) => (
                    <td
                      key={`empty-${player.rank}-${emptyCol}`}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderBottom: "1px solid #e2e8f0",
                        verticalAlign: "middle",
                        backgroundColor:
                          rowIndex % 2 >= 1 ? "#f8fafc" : "transparent",
                      }}
                    ></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(isRecalculating || isWalkthrough) && (
        <ErrorDialog
          key={`error-dialog-${isWalkthrough ? walkthroughIndex : "recalc"}`}
          error={isWalkthrough ? null : walkthroughErrors[walkthroughIndex]}
          players={players}
          mode={
            isWalkthrough
              ? "walkthrough"
              : isRecalculating
                ? "recalculate"
                : "error-correction"
          }
          entryCell={{
            playerRank: isWalkthrough
              ? getNonBlankCells()[walkthroughIndex]?.playerRank ||
                walkthroughIndex + 1
              : (isRecalculating
                  ? walkthroughErrors[walkthroughIndex]?.playerRank
                  : currentError?.playerRank) || 0,
            round: isWalkthrough
              ? (getNonBlankCells()[walkthroughIndex]?.round ??
                walkthroughIndex)
              : (isRecalculating
                  ? walkthroughErrors[walkthroughIndex]?.resultIndex
                  : currentError?.resultIndex) || 0,
          }}
          existingValue={
            isWalkthrough
              ? (() => {
                  const cell = getNonBlankCells()[walkthroughIndex];
                  if (!cell) return "";
                  return (
                    players[cell.playerRank - 1]?.gameResults?.[cell.round] ||
                    ""
                  );
                })()
              : isRecalculating && walkthroughErrors[walkthroughIndex]
                ? walkthroughErrors[
                    walkthroughIndex
                  ].originalString?.toUpperCase()
                : undefined
          }
          totalRounds={
            isWalkthrough
              ? countNonBlankRounds()
              : isRecalculating
                ? walkthroughErrors.length
                : countNonBlankRounds()
          }
          walkthroughErrors={isRecalculating ? walkthroughErrors : undefined}
          walkthroughIndex={
            isWalkthrough || isRecalculating ? walkthroughIndex : undefined
          }
          onWalkthroughNext={
            isWalkthrough || isRecalculating
              ? isWalkthrough
                ? handleWalkthroughNextForReview
                : handleWalkthroughNext
              : undefined
          }
          onWalkthroughPrev={
            isWalkthrough || isRecalculating
              ? isWalkthrough
                ? handleWalkthroughPrevForReview
                : handleWalkthroughPrev
              : undefined
          }
          onClose={() => {
            handleCorrectionCancel();
            setIsWalkthrough(false);
          }}
          onSubmit={handleCorrectionSubmit}
          onUpdatePlayerData={handleUpdatePlayerData}
        />
      )}
      {entryCell &&
        !isRecalculating &&
        !isWalkthrough &&
        walkthroughErrors.length === 0 && (
          <ErrorDialog
            error={null}
            players={players}
            mode="game-entry"
            entryCell={entryCell}
            existingValue={
              players[entryCell.playerRank - 1]?.gameResults[entryCell.round] ||
              undefined
            }
            onClose={() => {
              setEntryCell(null);
              setTempGameResult(null);
            }}
            onSubmit={handleGameEntrySubmit}
            onUpdatePlayerData={handleUpdatePlayerData}
          />
        )}
      {currentError && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            backgroundColor: "#f59e0b",
            color: "white",
            padding: "1rem",
            borderRadius: "0.5rem",
            zIndex: 999,
          }}
        >
          <button
            onClick={completeRatingCalculation}
            style={{
              background: "white",
              color: "#f59e0b",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Continue with corrections
          </button>
        </div>
      )}
    </div>
  );
}
