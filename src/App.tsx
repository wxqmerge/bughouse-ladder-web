import { useState, useRef } from "react";
import LadderForm from "./components/LadderForm";
import Settings from "./components/Settings";
import { loadSampleData } from "./components/LadderForm";
import type { PlayerData } from "./utils/hashUtils";
import "./css/index.css";

const MINI_GAMES = [
  "BG_Game",
  "Bishop_Game",
  "Pillar_Game",
  "Kings_Cross",
  "Pawn_Game",
  "Queen_Game",
] as const;

function getNextTitle(currentTitle: string): string {
  // Case-insensitive match to find the mini-game
  console.log(`>>> [getNextTitle] Looking for: "${currentTitle}"`);
  const index = MINI_GAMES.findIndex(
    (game) => game.toLowerCase() === currentTitle.toLowerCase(),
  );
  console.log(
    `>>> [getNextTitle] Found at index: ${index}, MINI_GAMES: ${MINI_GAMES.join(", ")}`,
  );
  if (index !== -1) {
    const next = MINI_GAMES[(index + 1) % MINI_GAMES.length];
    console.log(`>>> [getNextTitle] Next title: "${next}"`);
    return next;
  }
  console.log(
    `>>> [getNextTitle] Not found, returning current: "${currentTitle}"`,
  );
  return currentTitle;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [triggerWalkthrough, setTriggerWalkthrough] = useState(false);
  const recalculateRef = useRef<(() => void) | undefined>(undefined);

  const handleReset = () => {
    const samplePlayers = loadSampleData();
    localStorage.setItem("ladder_players", JSON.stringify(samplePlayers));
    window.location.reload();
  };

  const handleClearAll = () => {
    const emptyPlayers: Record<number, PlayerData> = {};
    localStorage.setItem("ladder_players", JSON.stringify(emptyPlayers));
    localStorage.removeItem("ladder_settings");
    window.location.reload();
  };

  const processNewDay = (reRank: boolean) => {
    const playersJson = localStorage.getItem("ladder_players");
    if (playersJson) {
      try {
        const players: Record<number, PlayerData> = JSON.parse(playersJson);

        // Get current title and determine next title for mini-games
        const currentTitle =
          localStorage.getItem("ladder_project_name") ||
          "Bughouse Chess Ladder";
        const nextTitle = getNextTitle(currentTitle);

        Object.values(players).forEach((player) => {
          const gameCount = (player.gameResults || []).filter(
            (r) => r !== null && r !== "",
          ).length;
          // If player had results, reset attendance to 0; otherwise increment
          player.attendance =
            gameCount > 0 ? 0 : (Number(player.attendance) || 0) + 1;
          player.rating = player.nRating;
          player.num_games = gameCount;
          player.gameResults = Array(31).fill(null);
        });

        if (reRank) {
          const sortedPlayers = Object.values(players).sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (ratingA !== ratingB) return ratingB - ratingA;
            return a.rank - b.rank;
          });

          sortedPlayers.forEach((player, index) => {
            player.rank = index + 1;
          });

          localStorage.setItem("ladder_players", JSON.stringify(sortedPlayers));
        } else {
          localStorage.setItem("ladder_players", JSON.stringify(players));
        }

        // Update title in localStorage (will be loaded on reload)
        localStorage.setItem("ladder_project_name", nextTitle);

        localStorage.removeItem("ladder_settings");
        window.location.reload();
      } catch (err) {
        console.error("Failed to process new day:", err);
      }
    }
  };

  const triggerNewDay = (reRank: boolean) => {
    console.log(`>>> [NEW DAY TRIGGERED] reRank=${reRank}`);
    // First, trigger recalculate ratings to check for errors
    if (recalculateRef.current) {
      // Set a flag indicating New Day is pending
      localStorage.setItem("ladder_pending_newday", JSON.stringify({ reRank }));
      console.log(
        `>>> [NEW DAY] Pending flag set: ${JSON.stringify({ reRank })}`,
      );
      // Call recalculate - if there are errors, it will show the error dialog
      // and not complete, so New Day won't proceed
      recalculateRef.current();
    } else {
      // Fallback: just process New Day directly
      console.warn(
        ">>> [NEW DAY] Recalculate ref not available, using fallback",
      );
      processNewDay(reRank);
    }
  };

  const handleNewDay = () => {
    triggerNewDay(false);
  };

  const handleNewDayWithReRank = () => {
    triggerNewDay(true);
  };

  const handleWalkThroughReports = () => {
    setTriggerWalkthrough(true);
  };

  const handleSetRecalculateRef = (ref: () => void) => {
    recalculateRef.current = ref;
  };

  return (
    <>
      <LadderForm
        setShowSettings={setShowSettings}
        triggerWalkthrough={triggerWalkthrough}
        setTriggerWalkthrough={setTriggerWalkthrough}
        onSetRecalculateRef={handleSetRecalculateRef}
      />
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onReset={handleReset}
          onClearAll={handleClearAll}
          onNewDay={handleNewDay}
          onNewDayWithReRank={handleNewDayWithReRank}
          onWalkThroughReports={handleWalkThroughReports}
        />
      )}
    </>
  );
}

export default App;
