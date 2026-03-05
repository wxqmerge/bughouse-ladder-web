# Bughouse Ladder - Git Automation Wrapper
# Run this at the start of each session to create a new branch

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Bughouse Ladder Git Automation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get current date/time
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Session started: $Timestamp" -ForegroundColor Green
Write-Host ""

# Generate branch name
$RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$BranchName = "session-$(Get-Date -Format 'yyyyMMdd')-${RandomSuffix}"

# Check if git repo exists
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not in a git repository" -ForegroundColor Red
    exit 1
}

# Create new branch
Write-Host "Creating branch: $BranchName" -ForegroundColor Cyan
git checkout -b $BranchName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create branch" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Branch created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "=== Quick Commands ===" -ForegroundColor Yellow
Write-Host "After each change, run:" -ForegroundColor White
Write-Host "  .\session-git.ps1 commit \"description\"" -ForegroundColor White
Write-Host ""
Write-Host "When done, run:" -ForegroundColor White
Write-Host "  .\session-git.ps1 push" -ForegroundColor White
Write-Host ""
Write-Host "To view status:" -ForegroundColor White
Write-Host "  git status" -ForegroundColor White
Write-Host ""
Write-Host "Current branch: $BranchName" -ForegroundColor Cyan