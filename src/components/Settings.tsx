/**
 * VB6 Bughouse Ladder - Settings Component
 * Translated from Settings.frm - Configuration dialog
 */

import { useState, useEffect } from "react";
import { X, Settings as SettingsIcon, Trash2 } from "lucide-react";
import "../css/index.css";

interface SettingsProps {
  onClose: () => void;
  onReset: () => void;
  onWalkThroughReports?: () => void;
}

export default function Settings({
  onClose,
  onReset,
  onWalkThroughReports,
}: SettingsProps) {
  const [showRatings, setShowRatings] = useState(true);

  useEffect(() => {
    const savedSettings = localStorage.getItem("ladder_settings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setShowRatings(parsedSettings.showRatings ?? true);
      } catch (err) {
        console.error("Failed to parse settings:", err);
      }
    }
  }, []);

  const handleSave = () => {
    const settings = {
      showRatings: [showRatings, showRatings, showRatings, showRatings],
    };
    localStorage.setItem("ladder_settings", JSON.stringify(settings));
    onClose();
    alert("Settings saved successfully!");
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all data to sample data? This will clear all loaded players and game results.",
      )
    ) {
      localStorage.clear();
      onReset();
      onClose();
      alert("Data has been reset to sample data.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface-color)",
          padding: "2rem",
          borderRadius: "0.5rem",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h2>
            <SettingsIcon size={24} style={{ marginRight: "0.5rem" }} />
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={showRatings}
              onChange={(e) => setShowRatings(e.target.checked)}
            />
            <span>Show ratings</span>
          </label>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              marginTop: "0.5rem",
            }}
          >
            A1 - A8, I1 - I8, Z1 - Z8 groups based on rating
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>

        {onWalkThroughReports && (
          <button
            onClick={() => {
              onClose();
              onWalkThroughReports();
            }}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.75rem",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Walk Through Reports
          </button>
        )}

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={handleClearAll}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.5rem",
              textAlign: "center",
            }}
          >
            Resets all players and game results to sample data
          </p>
        </div>
      </div>
    </div>
  );
}
