#!/bin/bash

# Bughouse Ladder Git Automation Script
# Creates branch, commits with timestamp, pushes to origin

# Get current date/time for commit message
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Generate branch name based on current date and random suffix
BRANCH_NAME="automation-$(date +%Y%m%d)-$(shuf -i 1000-9999 -n 1)"

# Function to check if we're in a git repo
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "Error: Not in a git repository"
        exit 1
    fi
}

# Function to create new branch
create_branch() {
    echo "Creating new branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create branch"
        exit 1
    fi
}

# Function to commit changes with timestamp
commit_changes() {
    local message="$1"
    
    # Check if there are changes to commit
    if git diff --cached --quiet && git diff --quiet; then
        echo "No changes to commit"
        return
    fi
    
    echo "Committing changes..."
    git add .
    git commit -m "[$TIMESTAMP] $message"
    
    if [ $? -ne 0 ]; then
        echo "Warning: Commit failed, but changes may be staged"
    else
        echo "Committed successfully"
    fi
}

# Function to push to remote
push_to_remote() {
    echo "Pushing to origin..."
    git push -u origin "$BRANCH_NAME"
    
    if [ $? -eq 0 ]; then
        echo "Pushed successfully to $BRANCH_NAME"
    else
        echo "Warning: Push failed"
    fi
}

# Main execution
echo "=== Git Automation Started ==="
echo "Timestamp: $TIMESTAMP"
echo "Branch: $BRANCH_NAME"
echo ""

# Check if git repo exists
check_git_repo

# Create new branch
create_branch

# Parse command line arguments
ACTION="${1:-commit}"

case "$ACTION" in
    "commit")
        # Commit with provided message or default
        MESSAGE="${2:-Manual commit}"
        commit_changes "$MESSAGE"
        ;;
    "push")
        # Just push current state
        commit_changes "Auto-commit before push"
        push_to_remote
        ;;
    "full")
        # Full automation: commit and push
        MESSAGE="${2:-Full automation session}"
        commit_changes "$MESSAGE"
        push_to_remote
        ;;
    *)
        echo "Usage: $0 [commit|push|full] [message]"
        echo "  commit - Stage and commit changes"
        echo "  push   - Stage, commit, and push to remote"
        echo "  full   - Full automation with custom message"
        exit 1
        ;;
esac

echo ""
echo "=== Git Automation Complete ==="
echo "Current branch: $(git branch --show-current)"
echo "Branch URL: $(git remote get-url origin 2>/dev/null || echo 'No remote configured')"