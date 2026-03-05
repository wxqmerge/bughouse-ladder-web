# Git Automation Scripts

This repository includes automated Git scripts to streamline the development workflow.

## Quick Start

### 1. Start a New Session

At the beginning of each work session, run:

```powershell
.\session-git.ps1
```

This will:

- Create a new branch with timestamp and random suffix (e.g., `session-20260304-1234`)
- Switch to that branch
- Display quick reference commands

### 2. After Each Change

After making changes, commit them with:

```powershell
.\git-auto.ps1 commit "Fixed clear cell button in recalculate mode"
```

This will:

- Stage all modified files
- Commit with timestamped message
- Keep you on the same branch

### 3. Push Changes

When ready to push to remote:

```powershell
.\git-auto.ps1 push
```

Or for custom message:

```powershell
.\git-auto.ps1 full "Implemented clear cell functionality"
```

## Script Reference

### `session-git.ps1`

Creates a new branch at the start of each session.

**Usage:**

```powershell
.\session-git.ps1
```

### `git-auto.ps1`

Flexible automation script with multiple actions.

**Actions:**

- `init` - Create branch, prepare for session (default)
- `commit [message]` - Stage and commit changes
- `push` - Stage, commit, and push to remote
- `full [message]` - Full automation with custom message

**Examples:**

```powershell
.\git-auto.ps1 init
.\git-auto.ps1 commit "Wrote new feature"
.\git-auto.ps1 full "Completed major refactoring"
```

### `git-automation.sh` (Linux/Mac)

Bash version of the automation scripts.

**Usage:**

```bash
./git-automation.sh init
./git-automation.sh commit "Fixed bug"
./git-automation.sh full "Major update"
```

## Branch Naming Convention

Branches follow this pattern:

- `session-YYYYMMDD-XXXX` - For development sessions
- `automation-YYYYMMDD-XXXX` - For automation tasks
- `session-git-YYYYMMDD-XXXX` - From session-git.ps1

Example: `session-20260304-1234`

## Best Practices

1. **Start fresh**: Always create a new branch for each session
2. **Commit frequently**: Commit after each logical change
3. **Clear messages**: Use descriptive commit messages
4. **Push regularly**: Push to remote before ending session
5. **Check status**: Run `git status` before committing

## Workflow Example

```powershell
# Start new session
.\session-git.ps1

# Make changes...

# Commit after fix
.\git-auto.ps1 commit "Fixed validation error clearing"

# Make more changes...

# Commit again
.\git-auto.ps1 commit "Updated clear cell for walkthrough mode"

# When done, push to remote
.\git-auto.ps1 push
```

## Troubleshooting

**No changes to commit?**

- Check with `git status`
- Ensure files are modified
- Run `git add .` manually if needed

**Push failed?**

- Check remote URL: `git remote -v`
- Ensure you're on the correct branch
- Try `git push origin <branch-name>`

**Already on a branch?**

- Script will create new branch anyway (best practice)
- Uncommitted changes will be carried over

## Notes

- Timestamps are in format: `YYYY-MM-DD HH:MM:SS`
- Branch names include random suffix to ensure uniqueness
- All scripts work with Git Bash, PowerShell, or Windows Command Prompt
- Requires Git to be installed and configured

---

For questions or issues, check the project README or contact the maintainers.
