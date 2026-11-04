# Sendora — 1-Click Deployment Automation Script for Windows
# Run: .\deploy.ps1

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "         SENDORA 1-CLICK DEPLOYMENT ENGINE            " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Check Node & pnpm
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required but was not found in PATH."
    exit 1
}

# Run the automated deployment script
node scripts/deploy-cloudflare.js

