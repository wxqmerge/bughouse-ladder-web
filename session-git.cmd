@echo off
REM Bughouse Ladder Git Automation Wrapper (Windows CMD)
REM Run this at the start of each session to create a new branch

title Bughouse Ladder - Git Automation

echo ======================================
echo   Bughouse Ladder Git Automation
echo ======================================
echo.

REM Get current date/time
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "MI=%dt:~10,2%"
set "SS=%dt:~12,2%"
set "Timestamp=%YYYY%-%MM%-%DD% %HH%:%MI%:%SS%"

echo Session started: %Timestamp%
echo.

REM Generate random suffix
set /a RandomSuffix=%RANDOM%%%9000+1000
set "BranchName=session-%YYYY%%MM%%DD%-%RandomSuffix%"

REM Check if git repo exists
if not exist ".git" (
    echo Error: Not in a git repository
    exit /b 1
)

REM Create new branch
echo Creating branch: %BranchName%
git checkout -b %BranchName%

if errorlevel 1 (
    echo Failed to create branch
    exit /b 1
)

echo.
echo Branch created successfully!
echo.
echo === Quick Commands ===
echo After each change, run:
echo   git-auto.ps1 commit "description"
echo.
echo When done, run:
echo   git-auto.ps1 push
echo.
echo To view status:
echo   git status
echo.
echo Current branch: %BranchName%