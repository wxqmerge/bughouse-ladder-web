# Git Automation Setup

## Files Created

1. **`session-git.ps1`** - Start new session (create branch)
2. **`git-auto.ps1`** - Commit/push automation
3. **`git-automation.sh`** - Bash version for Linux/Mac
4. **`GIT_AUTOMATION.md`** - Full documentation
5. **`package.json`** - Added npm scripts

## Usage

### Option 1: PowerShell Scripts (Windows)

```powershell
# Start new session
.\session-git.ps1

# After each change
.\git-auto.ps1 commit "Fixed bug"

# Push to remote
.\git-auto.ps1 push
```

### Option 2: NPM Scripts

```bash
# Start new session
npm run git:init

# After each change
npm run git:commit "Fixed bug"

# Push to remote
npm run git:push
```

### Option 3: Full Automation

```powershell
.\git-auto.ps1 full "Completed major feature"
```

This will commit and push in one command.

## Git Hooks (Optional)

To automatically commit after each prompt, you can set up a Git hook:

**`.git/hooks/post-commit`** (Linux/Mac):

```bash
#!/bin/bash
echo "Auto-commit enabled - use 'git-auto commit' to save changes"
```

**`.git/hooks/pre-push`** (Linux/Mac):

```bash
#!/bin/bash
echo "Pushing to remote..."
```

## Workflow Example

```powershell
# 1. Start session
npm run git:init

# 2. Make changes...

# 3. Commit after each fix
npm run git:commit "Fixed clear cell validation"

# 4. Make more changes...

# 5. Commit again
npm run git:commit "Updated walkthrough mode handling"

# 6. Push when done
npm run git:push
```

## Branch Naming

Branches are automatically named:

- `session-YYYYMMDD-XXXX` (e.g., `session-20260304-1234`)
- Includes date and random 4-digit suffix for uniqueness

## Next Steps

1. Test the scripts work in your environment
2. Configure Git remote if not already set up
3. Consider adding to AGENTS.md for future reference

Run `.\GIT_AUTOMATION.md` for complete documentation.
