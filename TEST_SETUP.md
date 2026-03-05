# Vitest Test Framework Setup

## Installation

Vitest has been successfully installed as the test framework for this project.

## Test Scripts

The following test commands are available in package.json:

- `npm run test` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI (for debugging and visualization)
- `npm run test:run` - Run tests once (no watch mode)
- `npm run test:coverage` - Run tests with coverage reports

## Configuration

### vitest.config.ts
- Test configuration file
- Uses jsdom environment for browser simulation
- Includes @testing-library/react and @testing-library/jest-dom
- Test files use `.test.ts` or `.test.tsx` extensions

### src/test/setup.ts
- Test setup file
- Extends Vitest's expect with jest-dom matchers
- Runs cleanup after each test

## Test Files

### src/test/simple.test.ts
Basic test demonstrating test structure.

### src/test/component.test.tsx
Component test example with JSX.

### src/components/LadderForm.test.tsx
Integration tests for the main LadderForm component.

## Running Tests

### Watch Mode (Interactive)
```bash
npm run test
```

### UI Mode (Visual Interface)
```bash
npm run test:ui
```

### Single Run (CI/CD)
```bash
npm run test:run
```

### With Coverage
```bash
npm run test:coverage
```

## Example Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Component Name', () => {
  it('should do something', () => {
    render(<Component />)
    expect(screen.getByText('expected text')).toBeInTheDocument()
  })
})
```

## Testing Libraries Used

- **Vitest**: Fast unit testing framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom matchers for DOM elements
- **jsdom**: JavaScript implementation of DOM for testing

## Notes

- Test files should use `.test.ts` or `.test.tsx` extensions
- Test setup file extends Vitest's expect with jest-dom matchers
- The jsdom environment simulates browser behavior for tests
- All tests pass successfully with the current implementation
