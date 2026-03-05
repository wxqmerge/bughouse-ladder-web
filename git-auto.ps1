# Bughouse Ladder Git Automation Script (PowerShell)
# Creates branch, commits with timestamp, pushes to origin

param(
    [string]$BranchPrefix = "automation",
    [string]$Action = "commit",
    [string]$Message = "Session commit"
)

# Get current date/time for commit message
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Generate branch name based on current date and random suffix
$RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$BranchName = "${BranchPrefix}-$(Get-Date -Format 'yyyyMMdd')-${RandomSuffix}"

# Function to check if we're in a git repo
function Test-GitRepo {
    if (-not (Test-Path ".git")) {
        Write-Host "Error: Not in a git repository" -ForegroundColor Red
        exit 1
    }
}

# Function to create new branch
function New-AutomationBranch {
    Write-Host "Creating new branch: $BranchName" -ForegroundColor Cyan
    try {
        git checkout -b $BranchName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to create branch" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to commit changes with timestamp
function Commit-Changes {
    param(
        [string]$CommitMessage
    )
    
    # Check if there are changes to commit
    $HasStagedChanges = git diff --cached --quiet
    $HasUnstagedChanges = git diff --quiet
    
    if ($HasStagedChanges -and $HasUnstagedChanges) {
        Write-Host "No changes to commit" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Committing changes..." -ForegroundColor Cyan
    git add .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Add failed" -ForegroundColor Red
        return
    }
    
    $FullMessage = "[$Timestamp] $CommitMessage"
    git commit -m $FullMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Committed successfully: $FullMessage" -ForegroundColor Green
    } else {
        Write-Host "Warning: Commit failed, but changes may be staged" -ForegroundColor Yellow
    }
}

# Function to push to remote
function Push-ToRemote {
    Write-Host "Pushing to origin..." -ForegroundColor Cyan
    try {
        git push -u origin $BranchName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pushed successfully to $BranchName" -ForegroundColor Green
        } else {
            Write-Host "Warning: Push failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error pushing: $_" -ForegroundColor Red
    }
}

# Main execution
Write-Host "=== Git Automation Started ===" -ForegroundColor Cyan
Write-Host "Timestamp: $Timestamp"
Write-Host "Branch: $BranchName" -ForegroundColor Cyan
Write-Host ""

# Check if git repo exists
Test-GitRepo

# Create new branch
New-AutomationBranch

# Execute action based on parameter
switch ($Action) {
    "commit" {
        Commit-Changes -CommitMessage $Message
    }
    "push" {
        Commit-Changes -CommitMessage "Auto-commit before push"
        Push-ToRemote
    }
    "full" {
        Commit-Changes -CommitMessage $Message
        Push-ToRemote
    }
    "init" {
        Write-Host "Branch created. Ready for work." -ForegroundColor Green
        Write-Host "Use 'git-auto commit <message>' to commit after each step" -ForegroundColor Yellow
        Write-Host "Use 'git-auto full <message>' to commit and push" -ForegroundColor Yellow
    }
    default {
        Write-Host "Usage:" -ForegroundColor Cyan
        Write-Host "  .\git-auto.ps1 init         - Create branch and prepare for session"
        Write-Host "  .\git-auto.ps1 commit       - Stage and commit changes"
        Write-Host "  .\git-auto.ps1 push         - Stage, commit, and push to remote"
        Write-Host "  .\git-auto.ps1 full <msg>   - Full automation with custom message"
    }
}

Write-Host ""
Write-Host "=== Git Automation Complete ===" -ForegroundColor Cyan
Write-Host "Current branch: $(git branch --show-current)" -ForegroundColor Cyan

# Show remote URL if available
$RemoteUrl = git remote get-url origin 2>$null
if ($RemoteUrl) {
    Write-Host "Remote: $RemoteUrl" -ForegroundColor Gray
}