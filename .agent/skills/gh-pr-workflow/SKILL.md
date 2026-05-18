---
name: gh-pr-workflow
description: >
  GitHub CLI PR workflow automation. Use when the user wants to commit, push, merge,
  or deploy code changes to a GitHub repository. This skill enforces PR-based workflows
  by automatically creating branches, opening pull requests, and merging through
  GitHub CLI (gh) instead of pushing directly to main or master. Triggers on any
  git commit/push/merge request or when the user mentions GitHub, PR, branch operations,
  or code review workflows.
---

# GitHub PR Workflow

> **Rule #1: Never push directly to `main` or `master`.** Every change must go through a pull request.

## Overview

This skill automates GitHub PR workflow using the `gh` CLI on Windows PowerShell.
It intercepts direct-push intents and routes them through branch → commit → push → PR → merge.

## Pre-flight Checks

Before any git operation, verify:

```powershell
gh auth status
```

If not authenticated, stop and run `gh auth login`.

## Workflow Decision Tree

```
User wants to commit/push
│
├─ Are we on main/master?
│  ├─ YES → Create feature branch → commit → push → create PR
│  └─ NO  → commit → push → create PR (if none exists)
│
└─ User wants to merge?
   └─ Find PR for current branch → merge --squash --delete-branch
```

## Detailed Steps

### Step 1: Create Branch (if on main/master)

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safe = "$description" -replace '[^a-zA-Z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
$branch = "feature/$timestamp-$safe"
git checkout -b $branch
```

### Step 2: Commit

```powershell
git add -A
git commit -m "$message"
```

### Step 3: Push Branch

```powershell
git push -u origin $branch
```

### Step 4: Create Pull Request

```powershell
gh pr create --title "$title" --body "$body" --base main
```

Capture the PR URL and report it to the user.

### Step 5: Merge (only when user explicitly approves)

```powershell
gh pr merge --squash --delete-branch
```

After merge, switch back to main and pull:

```powershell
git checkout main
git pull
```

## Scripts

Use the bundled PowerShell scripts for deterministic execution:

- **`scripts/create-pr.ps1`** — One-shot: branch → commit → push → open PR
- **`scripts/merge-pr.ps1`** — Merge the PR for the current branch and clean up

Run them with parameters instead of rewriting commands:

```powershell
.\scripts\create-pr.ps1 -Title "feat: add login page" -Body "Closes #42"
```

## Handling Errors

| Scenario | Action |
|----------|--------|
| `gh` not installed | Prompt user to install GitHub CLI |
| Not authenticated | Run `gh auth login` |
| PR already exists | Skip creation, show existing PR URL |
| Merge conflict | Stop, instruct user to resolve conflicts |
| No changes to commit | Exit gracefully, inform user |

## References

- **`references/gh-commands.md`** — Quick reference for common `gh` CLI commands
