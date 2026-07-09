# ShapeHive WordPress Backend REST API Health Checker
$ErrorActionPreference = "Continue"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SHAPEHIVE BACKEND HEALTH CHECKER   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$cmsBaseUrl = "https://cms.sasanperfumes.com/wp-json"
Write-Host "Target CMS Base URL: $cmsBaseUrl" -ForegroundColor Yellow
Write-Host ""

$endpoints = @(
    @{ Path = "sasanperfumes/v1/home-settings"; Name = "Homepage Hero & Banners Settings" },
    @{ Path = "sasanperfumes/v1/home-sections"; Name = "Homepage Core Content Sections" },
    @{ Path = "sasanperfumes/v1/site-settings"; Name = "Site Identity & Branding Settings" },
    @{ Path = "sasanperfumes/v1/header-settings"; Name = "Header Logo & Navigation Config" },
    @{ Path = "sasanperfumes/v1/seo-settings"; Name = "Global SEO & Tracking Config" },
    @{ Path = "sasanperfumes/v1/topbar"; Name = "Topbar Promotional Banner Settings" },
    @{ Path = "sasanperfumes/v1/footer-settings"; Name = "Footer Information & Columns" },
    @{ Path = "sasanperfumes/v1/feature-toggles"; Name = "Storefront Feature Toggles List" },
    @{ Path = "sasanperfumes/v1/whatsapp"; Name = "WhatsApp Floating Button Config" },
    @{ Path = "sasanperfumes/v1/brands"; Name = "All Brands & Product Taxonomy Notes" },
    @{ Path = "sasanperfumes/v1/brands-page"; Name = "Brands Listing Page Settings" },
    @{ Path = "wp/v2/posts"; Name = "WordPress Core Blog Posts API" }
)

$passedCount = 0
$failedCount = 0

# Set a custom user agent to avoid security or bot-block triggers
$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    "Accept" = "application/json"
}

foreach ($ep in $endpoints) {
    $url = "$cmsBaseUrl/$($ep.Path)"
    Write-Host "Checking: $($ep.Name)..." -NoNewline
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $url -Headers $headers -Method Get -TimeoutSec 30 -UseBasicParsing
        $endTime = Get-Date
        $durationMs = [Math]::Round(($endTime - $startTime).TotalMilliseconds)

        if ($response.StatusCode -eq 200) {
            # Attempt to parse as JSON
            $json = $response.Content | ConvertFrom-Json
            
            # Print brief summary depending on the endpoint type
            $details = ""
            if ($ep.Path -eq "sasanperfumes/v1/feature-toggles") {
                $enabledToggles = @()
                foreach ($prop in $json.PSObject.Properties) {
                    if ($prop.Value -eq $true -or $prop.Value -eq "1" -or $prop.Value -eq 1) {
                        $enabledToggles += $prop.Name
                    }
                }
                $details = "($($enabledToggles.Count) toggles enabled)"
            } elseif ($ep.Path -eq "sasanperfumes/v1/brands") {
                $details = "($($json.Count) brands loaded)"
            } elseif ($ep.Path -eq "sasanperfumes/v1/services") {
                $details = "($($json.Count) services loaded)"
            } elseif ($ep.Path -eq "wp/v2/posts") {
                $details = "($($json.Count) posts loaded)"
            } elseif ($ep.Path -eq "sasanperfumes/v1/home-settings") {
                $details = "($($json.hero.slides.Count) hero slides)"
            }

            Write-Host " [OK - 200 OK] in ${durationMs}ms $details" -ForegroundColor Green
            $passedCount++
        } else {
            Write-Host " [FAIL - Status $($response.StatusCode)]" -ForegroundColor Red
            $failedCount++
        }
    } catch {
        Write-Host " [FAIL - Error: $($_.Exception.Message)]" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "BACKEND HEALTH SUMMARY:" -ForegroundColor Cyan
Write-Host "  ACCESSIBLE ENDPOINTS: $passedCount" -ForegroundColor Green
if ($failedCount -eq 0) {
    Write-Host "  FAILED ENDPOINTS: $failedCount" -ForegroundColor Green
    Write-Host "  STATUS: HEALTHY" -ForegroundColor Green
} else {
    Write-Host "  FAILED ENDPOINTS: $failedCount" -ForegroundColor Red
    Write-Host "  STATUS: DEGRADED" -ForegroundColor Red
}
Write-Host "=============================================" -ForegroundColor Cyan
