# Bughouse Chess Ladder Web Application

## Overview

A web-based application for managing Bughouse Chess player rankings and ladder standings. This tool allows users to import chess ladder data, sort players by various criteria, view game results, and manage player ratings.

## Features

### File Management

- Import chess ladder data from Excel (.xls) or text files (.txt, .tab)
- Load and display up to 200 players per session
- Save/load ladder data to/from browser localStorage

### Player Management

- View players sorted by rank, name, new rating, or previous rating
- Edit player information in place
- Recalculate player ratings
- Admin mode for advanced modifications

### Game Results

- Track game results across 31 rounds
- View results by player or by round
- Sort and filter game data

#### Result String Format

Game results can be entered in two formats:

**2-Player Format:** `player1RESULTplayer2` or `player1RESULT1RESULT2player2`

- Single result between players: `5W6` (player 5 wins against player 6)
- Multiple results (bughouse boards): `5WL6` (board 1: W, board 2: L)
- Up to 2 results allowed per game

**4-Player Format:** `player1:player2RESULT[RESULT]player3:player4`

- Colon separates pairs within same team
- Results come after first pair
- Example: `5:6W7:8` or `5:6WL7:8`
  - Players 5 & 6 vs players 7 & 8
  - W = both 5 and 6 win (or WL if split results)

**Validation Rules:**

1. Must have at least 2 players
2. Must have at least 1 result
3. If colon used, must be 4-player format with all 4 players
4. Maximum 2 results allowed per game (one per board in bughouse)

### User Interface

- Responsive design with zoom controls (100% or 140%)
- Dark theme header with project information
- Color-coded buttons for different actions
- Mobile-friendly layout

## Technical Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Inline CSS with template literals
- **Icons**: Lucide React
- **File Handling**: SheetJS/xlsx
- **Table Component**: @tanstack/react-table

## Project Structure

```
bughouse-ladder-web/
├── src/
│   ├── components/
│   │   ├── LadderForm.tsx      # Main ladder management component
│   │   └── Settings.tsx         # Application settings
│   ├── css/
│   │   └── index.css            # Global styles
│   ├── types/
│   │   └── hashUtils.ts         # TypeScript type definitions
│   └── main.tsx                 # Application entry point
├── dist/                         # Production build output
├── package.json                  # Dependencies and scripts
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript configuration
```

## Data Format

### Player Data Structure

Players are imported from Excel or text files with the following columns:

| Column     | Description         |
| ---------- | ------------------- |
| Group      | Player group/team   |
| Last Name  | Player's last name  |
| First Name | Player's first name |
| Rating     | Current rating      |
| Rank       | Ladder ranking      |
| New Rating | Updated rating      |
| Grade      | Player grade        |

### Game Results Format

Game results are stored in a 2D array representing rounds and player results.


### Error Dialog Parsing Logic

**Input Processing:**

```
1. Normalize input to uppercase
2. Filter characters: 0-9 (max 3 digits), W, L, D, :
3. Parse character by character:
   - Digits accumulate in entryString
   - Colon (:) stores player and increments entry counter
   - W/L/D stores result and clears entryString
4. Store final player number at end of string
```

```

**Player Storage:**

- playersList[0] = First player number
- playersList[1] = Second player number
- playersList[2] = Third player number (if 4-player)
- playersList[3] = Fourth player number (if 4-player)
- results[0] = First result character
- results[1] = Second result character (optional)

**Example Parsing:** `5:6W7:8`

```
Character '5': entryString = "5"
Character ':': Store playersList[0]=5, entry=1, entryString=""
Character '6': entryString = "6"
Character 'W': Store playersList[1]=6, entry=2, results[0]="W", entryString=""
Character '7': entryString = "7"
Character ':': Store playersList[2]=7, entry=3, entryString=""
Character '8': entryString = "8"
End: Store playersList[3]=8, entry=4

Result: 4-player game with results [W]
```

**Example Parsing:** `5W6`

```
Character '5': entryString = "5"
Character 'W': Store playersList[0]=5, entry=1, results[0]="W", entryString=""
Character '6': entryString = "6"
End: Store playersList[1]=6, entry=2

Result: 2-player game with results [W]
```

## Development

### Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

### Code Quality

- Run ESLint: `npm run lint`
- Run TypeScript type checking: `npm run build`

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
