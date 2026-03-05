# AGENTS.md

## Project Documentation

- **Project Description**: See `description.md` for detailed information about the Bughouse Chess Ladder application
- **Features**: File management, player sorting, rating recalculation, game results tracking
- **Data Format**: Player data structure and game results format specifications

## Build and Development Commands

### Development
- **Start the development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

### Code Quality
- **Run ESLint**: `npm run lint`
- **Run type checking**: `npx tsc -b` or included in `npm run build`
- **Project uses ESLint** (no separate formatter configured)

### Testing
- **No test framework currently configured** in package.json
- Tests are not part of the build pipeline
- If adding tests, install a test framework (Vitest recommended for Vite projects)
- If you need to test existing functionality, use `npm run build` to ensure code correctness

## Code Style Guidelines

### Imports
1. React hooks and utilities first: `import { useState, useEffect, useRef } from 'react'`
2. Then component imports: `import ComponentName from './path'`
3. External libraries in dependency order (UI libraries first, then utilities)
4. Local imports last: `import './css/index.css'`

### Components
1. **Functional components only** with `export default`
2. **PascalCase** naming convention
3. **Type annotations** required for props interfaces
4. Default export syntax: `export default function ComponentName()`
5. Default values for props: `function Component({ prop }: Props = {})`
6. Use `<></>` (Fragment) for multiple siblings in JSX
7. No side effects in render functions—use `useEffect` or `useMemo`

### TypeScript
1. All files must be `.tsx` or `.ts`
2. Use **strict types** and optional chaining (`?.`) frequently
3. Provide fallback values: `value || defaultValue`
4. Type literals for unions: `'status' | 'error' | 'loading'`
5. Nullish coalescing: `col[0] || ''` instead of `col[0]`
6. Avoid `any` types—use proper interfaces or utility types
7. Explicitly type state variable initial values
8. Use TypeScript enums when appropriate
9. Explicitly cast when necessary: `as Type`

### Naming Conventions
- **Components**: PascalCase (e.g., `LadderForm`, `Settings`, `AppForm`)
- **Functions**: camelCase (e.g., `loadPlayers`, `handleSort`, `formatDate`)
- **Variables**: camelCase (e.g., `players`, `isWide`, `fileName`)
- **Constants**: UPPER_SNAKE_CASE if global (less common in this project)
- **Interfaces/types**: PascalCase (e.g., `PlayerData`, `LadderFormProps`)
- **File names**: match component names (e.g., `LadderForm.tsx`, `App.tsx`)

### Styling
1. Use **inline styles** with template literals for component-specific styles
2. Consistent spacing: `padding: '0.5rem'`, `gap: '1rem'`, `margin: '1rem'`
3. Use hex colors (avoid standard color names like 'red', 'blue')
4. Consistent spacing values: `0.5rem` for small spacing, `1rem` for medium
5. Grid templates: `gridTemplateColumns: 'repeat(4, 1fr)'`
6. Border radius values: `0.25rem`, `0.5rem`, `9999px` (pill shape)
7. Font sizes: `'0.75rem'`, `'0.875rem'`, `'1rem'`, `'1.25rem'`, `'1.5rem'`
8. Style objects should be consistent with one another

### Error Handling
1. **Try-catch for localStorage**: `try { localStorage.setItem(...) } catch (err) {}`
2. **Validate before parsing**: `if (col[4] && !isNaN(parseInt(col[4])))`
3. **Null safety**: `e.target?.result`, `file?.[0]`, `prevChar ? prevChar.match(pattern) : null`
4. **Fallback values**: `parseInt(cols[4] || '0')`, `value || ''`
5. **Error logging**: `console.error('Error message', err)`
6. **Graceful degradation** for missing data

### React Best Practices
1. **Hooks must be at top** of functional components, before any return
2. **Avoid side effects in render**—use `useEffect` or `useMemo`
3. **Key props** for list rendering: `{items.map((item) => <div key={item.id}>`
4. **Typed event handlers**: `onClick={() => handleChange()}`
5. **Ref API** for DOM elements: `useRef<HTMLInputElement>(null)`
6. **Conditional rendering**: `{condition && <Component />}` or ternary
7. **Immutable updates**: `setPlayers(prev => ({ ...prev, ...newData }))`
8. **Separation of concerns**: State declarations, handlers, and JSX grouped separately

### Formatting and Organization
1. Group logical statements together in functions
2. Import statements at top of file (no inline imports)
3. Comments for complex logic (especially parsing)
4. Logical grouping: state, handlers, JSX separated
5. Functions focused on single responsibility
6. Use `const` for immutability, `let` for mutable (rarely needed)

### Accessibility
1. Proper button labels and semantic HTML elements
2. Accessibility attributes: `aria-label`, `role` where appropriate
3. Keyboard navigation considerations
4. Focus management for modals/overlays

### File Structure
1. **Root**: `src/` - Contains components, types, utilities
2. **Components**: `src/components/` - Named exports if needed
3. **Types**: `src/types.ts` - Shared interfaces and types
4. **CSS**: `src/css/` - Module styles (currently `src/css/index.css`)
5. **Entry**: `src/main.tsx`

### External Libraries
1. **lucide-react**: Icon library—`import { IconName } from 'lucide-react'`
2. **SheetJS/xlsx**: Excel file handling
3. **@tanstack/react-table**: Table component and features

### Known Issues to Avoid
1. Don't duplicate extensive logic (runTests manually reads and parses kings_cross.tab file, then calls recalculateRatings and exportPlayers)
2. Don't use `any` type when proper typing exists
3. Don't access localStorage synchronously in render without checks
4. Don't mutate state directly—always use setter functions
5. Don't inline complex event handlers that reference local variables

## Function Implementation Details

### runTests() Function
The `runTests()` function in `LadderForm.tsx` is a testing utility that:
- **Purpose**: to simulate pressing buttons in GUI
- **Workflow**:
  1. Creates a hidden file input element
  2. Triggers file selection dialog
  3. When user selects a file, reads it as text
  5. Sets player data from parsing results
  6. Calls `recalculateRatings()` to calculate new ratings based on game results
  7. Calls `exportPlayers()` to export the updated data

## Getting Started for New Agents

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start a hot reload server
3. Run `npx tsc -b` for type checking (ensure code passes type checks)
4. Run `npm run lint` before committing changes
5. Follow naming conventions and component patterns
6. Test changes locally before pushing