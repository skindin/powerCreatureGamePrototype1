# test-commit.ps1 - Git commit test runner for Power Creature Game
param(
    [string]$Target = "list"
)

$activeBranch = "feat/dynamic-property-references"

function Show-Help {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "   Power Creature Prototype - Commit Test Runner" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "Commands:"
    Write-Host "  .\test-commit.ps1 list            - List recent commits with indexes"
    Write-Host "  .\test-commit.ps1 <index|hash>    - Checkout a commit (detached) & rebuild"
    Write-Host "  .\test-commit.ps1 prev            - Step 1 commit backwards (older)"
    Write-Host "  .\test-commit.ps1 next            - Step 1 commit forwards (newer)"
    Write-Host "  .\test-commit.ps1 bisect          - Instructions for Git Bisect binary search"
    Write-Host "  .\test-commit.ps1 restore         - Return to latest ($activeBranch) & rebuild"
    Write-Host ""
}

if ($Target -eq "list" -or $Target -eq "ls") {
    Show-Help
    Write-Host "Recent Commits on ${activeBranch}:" -ForegroundColor Green
    $commits = git log -n 35 --pretty=format:"%h|%ad|%s" --date=short $activeBranch
    $idx = 0
    foreach ($line in $commits) {
        $parts = $line.Split('|', 3)
        $hash = $parts[0]
        $date = $parts[1]
        $msg = $parts[2]
        
        $currentHead = git rev-parse --short HEAD
        $marker = "   "
        $color = "Gray"
        if ($hash -eq $currentHead) {
            $marker = "-> "
            $color = "Green"
        }
        if ($msg -match "physics|throw|sync|rubber|bounce") {
            $color = "Yellow"
        }
        
        $idxStr = "{0,2}" -f $idx
        Write-Host "$marker[$idxStr] $hash ($date) $msg" -ForegroundColor $color
        $idx++
    }
    Write-Host ""
    Write-Host "Tip: Run '.\test-commit.ps1 <index>' or '.\test-commit.ps1 <hash>' to test that commit." -ForegroundColor Cyan
    exit 0
}

if ($Target -eq "restore" -or $Target -eq "main" -or $Target -eq "reset") {
    Write-Host "Returning to active branch: $activeBranch..." -ForegroundColor Cyan
    git checkout $activeBranch
    Write-Host "Rebuilding client and server bundles..." -ForegroundColor Cyan
    npm run build
    Write-Host "Done! You are now back on $activeBranch. Hit F5 or 'Sync New Code' in the EXE!" -ForegroundColor Green
    exit 0
}

if ($Target -eq "bisect") {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "   Git Bisect Binary Search Workflow" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "1. Start bisect:"
    Write-Host "   git bisect start" -ForegroundColor White
    Write-Host "   git bisect bad HEAD" -ForegroundColor Red
    Write-Host "   git bisect good c5f641f" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. At each step, rebuild and test in the EXE:"
    Write-Host "   npm run build" -ForegroundColor White
    Write-Host "   (Test in EXE, hit Refresh Client / F5)"
    Write-Host "   If physics are good: git bisect good" -ForegroundColor Green
    Write-Host "   If physics are broken: git bisect bad" -ForegroundColor Red
    Write-Host ""
    Write-Host "3. When bisect announces the culprit commit, exit with:"
    Write-Host "   git bisect reset" -ForegroundColor Cyan
    exit 0
}

if ($Target -eq "prev") {
    Write-Host "Stepping 1 commit backwards (older)..." -ForegroundColor Cyan
    git checkout HEAD~1
    npm run build
    Write-Host "Checked out older commit $(git rev-parse --short HEAD). Hit F5 in the EXE to test!" -ForegroundColor Green
    exit 0
}

if ($Target -eq "next") {
    Write-Host "Stepping 1 commit forward..." -ForegroundColor Cyan
    # Find next commit toward the branch
    $nextHash = git rev-list --topo-order HEAD..$activeBranch | Select-Object -Last 1
    if (-not $nextHash) {
        Write-Host "Already at the tip of $activeBranch." -ForegroundColor Yellow
        exit 0
    }
    git checkout $nextHash
    npm run build
    Write-Host "Checked out commit $(git rev-parse --short HEAD). Hit F5 in the EXE to test!" -ForegroundColor Green
    exit 0
}

# If numerical index was passed (e.g. 0, 1, 5, 20)
if ($Target -match "^\d+$") {
    $idx = [int]$Target
    $commitHash = git log -n ($idx + 1) --pretty=format:"%h" $activeBranch | Select-Object -Last 1
    if (-not $commitHash) {
        Write-Host "Invalid commit index: $Target" -ForegroundColor Red
        exit 1
    }
    $commitMsg = git log -n 1 --pretty=format:"%s" $commitHash
    Write-Host "Checking out commit [$idx] ${commitHash}: $commitMsg..." -ForegroundColor Cyan
    git checkout $commitHash
    npm run build
    Write-Host "Checked out $commitHash. Hit F5 or 'Sync New Code' in the EXE to test!" -ForegroundColor Green
    exit 0
}

# Assume it's a commit hash or branch name
Write-Host "Checking out $Target in detached HEAD..." -ForegroundColor Cyan
git checkout $Target
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to checkout $Target. Check the hash or run '.\test-commit.ps1 list'." -ForegroundColor Red
    exit 1
}
Write-Host "Rebuilding client and server bundles for $Target..." -ForegroundColor Cyan
npm run build
Write-Host "Checked out $(git rev-parse --short HEAD). Hit F5 or 'Sync New Code' in the EXE to test!" -ForegroundColor Green
