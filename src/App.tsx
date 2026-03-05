import { useState, useRef } from "react";
import LadderForm from "./components/LadderForm";
import Settings from "./components/Settings";
import { loadSampleData } from "./components/LadderForm";
import "./css/index.css";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [triggerWalkthrough, setTriggerWalkthrough] = useState(false);
  const recalculateRef = useRef<(() => void) | undefined>(undefined);

  const handleReset = () => {
    const samplePlayers = loadSampleData();
    // Trigger a re-render by calling loadSampleData from localStorage
    localStorage.setItem("ladder_players", JSON.stringify(samplePlayers));
    window.location.reload();
  };

  const handleWalkThroughReports = () => {
    if (recalculateRef.current) {
      recalculateRef.current();
    }
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
          onWalkThroughReports={handleWalkThroughReports}
        />
      )}
    </>
  );
}

export default App;
