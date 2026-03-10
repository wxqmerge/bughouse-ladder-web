import { useState, useRef } from "react";
import LadderForm from "./components/LadderForm";
import Settings from "./components/Settings";
import { loadSampleData } from "./components/LadderForm";
import type { PlayerData } from "./utils/hashUtils";
import "./css/index.css";

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
        Object.values(players).forEach((player) => {
          player.rating = player.nRating;
          player.num_games = (player.gameResults || []).filter(
            (r) => r !== null && r !== "",
          ).length;
          player.attendance = 0;
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

        localStorage.removeItem("ladder_settings");
        window.location.reload();
      } catch (err) {
        console.error("Failed to process new day:", err);
      }
    }
  };

  const handleNewDay = () => {
    processNewDay(false);
  };

  const handleNewDayWithReRank = () => {
    processNewDay(true);
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
