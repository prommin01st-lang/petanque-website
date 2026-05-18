<#
.SYNOPSIS
    Merges the pull request for the current branch and cleans up.
.DESCRIPTION
    Finds the open PR associated with the current branch, merges it with --squash,
    deletes the branch, and switches back to main.
.PARAMETER Method
    Merge method: squash (default) or merge.
.EXAMPLE
    .\merge-pr.ps1
    .\merge-pr.ps1 -Method merge
#>
param(
    [ValidateSet("squash", "merge")]
    [string]$Method = "squash"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) not found."
    exit 1
}

$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    Write-Error "Not inside a git repository."
    exit 1
}

if ($currentBranch -eq "main" -or $currentBranch -eq "master") {
    Write-Error "You are on $currentBranch. Switch to a feature branch first."
    exit 1
}

# ── Find PR ───────────────────────────────────────────────────────────
Write-Host ">>> Looking for open PR on branch '$currentBranch'..." -ForegroundColor Cyan
$prInfo = gh pr list --head $currentBranch --json number,url -q '.[0]' 2>$null | ConvertFrom-Json
if (-not $prInfo) {
    Write-Error "No open PR found for branch '$currentBranch'."
    exit 1
}

Write-Host ">>> Found PR #$($prInfo.number): $($prInfo.url)" -ForegroundColor Cyan

# ── Merge ─────────────────────────────────────────────────────────────
Write-Host ">>> Merging with --$Method --delete-branch..." -ForegroundColor Cyan
gh pr merge $prInfo.number --$Method --delete-branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Merge failed. Resolve conflicts manually if needed."
    exit 1
}

# ── Return to main ────────────────────────────────────────────────────
Write-Host ">>> Switching to main and pulling latest..." -ForegroundColor Cyan
git checkout main
git pull

Write-Host ">>> Done!" -ForegroundColor Green
