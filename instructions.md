# Bughouse Chess Ladder - Application Instructions

## Project Overview
A web-based application for managing and displaying Bughouse Chess ladder statistics, allowing data import from Excel/Text files and export to compatible formats.

## Data Handling

### Import Files
- **Supported Formats**: tab-delimited files
- **Supported File extensions**: `.xls`, `.txt` 
- **Header Detection**: Automatically detects and skips rows starting with "Group" during import
- **Data Persistence**: Saves to `localStorage` for session persistence
- **Data Limits**: read upto 200 players

### Browser Storage
- **Store Key**: `ladder_players` - JSON array of player objects
- **Settings Key**: `ladder_settings` - Stores app configuration
- **Persistence**: Data persists in browser LocalStorage until explicitly cleared


### Data Structure Mapping For File i/o
- **Column 0**: Group
- **Column 1**: Last Name
- **Column 2**: First Name
- **Column 3**: Rnk (Rank)
- **Column 4**: Rating (previous)
- **Column 5**: New Rating (caculated)
- **Column 6-12**: player data only displayed in admin mode
- **Column 13-44**: Round results (columns 1-31 in the display grid)


## Sorting and Display

### Sorting Order
- **Primary Sort**: The value of the `Rnk` column is the row position the player should be in


### Grid Display (User Mode) 
- **Grid display**:with vertical lines and zebra coloring
- **Column 0**: Rank (Rnk)
- **Column 1**: Group
- **Column 2**: Last Name
- **Column 3**: First Name
- **Column 4**: previous Rating
- **Column 5**: New Rating (caculated)
- **Round Columns (1-31)**: Game results from columns 13-44 of import file. Should be displayed as numeric values, not arrows.  New values can be entered as game results 

### Grid Display (Admin Mode)
- **Column (0-31)**: all cells editable


## Export Functionality

### Export Format
- **File Type**: Tab-delimited text file (`.txt`) - compatible with Excel
- **Includes Header**: Must include the "Group" header row as the first line for Excel formatting
- **Export Content**: Includes all player data columns 

## Version Tracking
- **Version Display**: Small version number displayed at top of navbar
- **Format**: "v1.3.2" style versioning for tracking updates

## File Requirements
- **Import Files**: tab-delimited text files from `MiniGame.xls` format

### LocalStorage Implementation
The application uses browser LocalStorage API for data and settings persistence:
- **Read**: `localStorage.getItem('ladder_players')`
- **Write**: `localStorage.setItem('ladder_players', JSON.stringify(players))`
- **Clear**: `localStorage.clear()` to reset all data

