# GitHub CLI Commands Reference

## Authentication

| Command | Purpose |
|---------|---------|
| `gh auth login` | Login to GitHub (web or token flow) |
| `gh auth status` | Check current auth state |
| `gh auth logout` | Remove credentials |

## Repository

| Command | Purpose |
|---------|---------|
| `gh repo view` | Show repo info |
| `gh repo view --json url` | Get repo URL as JSON |
| `gh repo clone <owner/repo>` | Clone a repository |

## Pull Requests

| Command | Purpose |
|---------|---------|
| `gh pr create --title "..." --body "..."` | Create a new PR |
| `gh pr create --draft` | Create a draft PR |
| `gh pr list` | List open PRs |
| `gh pr view` | View current branch's PR |
| `gh pr view --json number,url` | Get PR metadata as JSON |
| `gh pr checkout <number>` | Checkout a PR branch locally |
| `gh pr merge <number> --squash --delete-branch` | Merge and cleanup |
| `gh pr merge --auto --squash` | Enable auto-merge |
| `gh pr close <number>` | Close without merging |
| `gh pr review --approve <number>` | Approve a PR |

## Issues

| Command | Purpose |
|---------|---------|
| `gh issue create --title "..." --body "..."` | Create an issue |
| `gh issue list` | List open issues |
| `gh issue view <number>` | View issue details |

## Workflow Runs (CI/CD)

| Command | Purpose |
|---------|---------|
| `gh run list` | List recent workflow runs |
| `gh run view <id>` | View run logs |
| `gh run watch <id>` | Stream run logs live |

## Release

| Command | Purpose |
|---------|---------|
| `gh release create <tag>` | Create a release |
| `gh release list` | List releases |

## Common Flags

- `--repo owner/repo` — Target a specific repository
- `--web` — Open the result in browser
- `--json field1,field2` — Output as JSON
