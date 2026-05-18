<#
.SYNOPSIS
    Creates a feature branch, commits changes, pushes, and opens a GitHub PR.
.DESCRIPTION
    If currently on main/master, creates a timestamped feature branch first.
    Then stages all changes, commits, pushes, and opens a pull request via gh CLI.
.PARAMETER Title
    Commit message and PR title (required).
.PARAMETER Body
    PR description markdown (optional).
.PARAMETER BaseBranch
    Target branch for the PR (default: main).
.EXAMPLE
    .\create-pr.ps1 -Title "feat: add dark mode" -Body "Closes #7"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [string]$Body = "",

    [string]$BaseBranch = "main"
)

$ErrorActionPreference = "Stop"

# ── 1. Verify gh CLI ──────────────────────────────────────────────────
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) not found. Install from https://cli.github.com/"
    exit 1
}

gh auth status *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not authenticated to GitHub. Run: gh auth login"
    exit 1
}

# ── 2. Determine branch ───────────────────────────────────────────────
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    Write-Error "Not inside a git repository."
    exit 1
}

$targetBranch = $currentBranch

if ($currentBranch -eq $BaseBranch -or $currentBranch -eq "master") {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = ($Title -replace '[^a-zA-Z0-9]', '-') -replace '-+', '-' -replace '^-|-$', ''
    $targetBranch = "feature/$timestamp-$safe"

    Write-Host ">>> Creating branch: $targetBranch" -ForegroundColor Cyan
    git checkout -b $targetBranch
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# ── 3. Commit ─────────────────────────────────────────────────────────
Write-Host ">>> Committing changes..." -ForegroundColor Cyan
$hasChanges = git status --porcelain 2>$null
if (-not $hasChanges) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
    exit 0
}

git add -A
git commit -m "$Title"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Commit failed."
    exit 1
}

# ── 4. Push ───────────────────────────────────────────────────────────
Write-Host ">>> Pushing to origin/$targetBranch..." -ForegroundColor Cyan
git push -u origin $targetBranch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push failed."
    exit 1
}

# ── 5. Create PR ──────────────────────────────────────────────────────
Write-Host ">>> Opening pull request..." -ForegroundColor Cyan
$prUrl = gh pr create --title $Title --body $Body --base $BaseBranch 2>&1
if ($LASTEXITCODE -ne 0) {
    # If PR already exists, gh prints the existing URL anyway
    if ($prUrl -match "https://github.com/\S+/pull/\d+") {
        Write-Host "Pull request already exists: $($matches[0])" -ForegroundColor Green
        exit 0
    }
    Write-Error "Failed to create PR: $prUrl"
    exit 1
}

Write-Host ">>> Pull request created: $prUrl" -ForegroundColor Green
Write-Host "    Branch : $targetBranch" -ForegroundColor Gray
