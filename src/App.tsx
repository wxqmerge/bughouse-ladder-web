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

  const handleNewDay = () => {
    const playersJson = localStorage.getItem("ladder_players");
    if (playersJson) {
      try {
        const players: Record<number, PlayerData> = JSON.parse(playersJson);
        Object.values(players).forEach((player) => {
          player.rating = player.nRating;
          player.gameResults = Array(31).fill(null);
        });
        localStorage.setItem("ladder_players", JSON.stringify(players));
        localStorage.removeItem("ladder_settings");
        window.location.reload();
      } catch (err) {
        console.error("Failed to process new day:", err);
      }
    }
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
          onWalkThroughReports={handleWalkThroughReports}
        />
      )}
    </>
  );
}

export default App;
