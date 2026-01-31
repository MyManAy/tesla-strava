# Tesla Fleet API Partner Registration Script
# Run this ONCE to register your app with Tesla

$CLIENT_ID = $env:TESLA_CLIENT_ID
$CLIENT_SECRET = $env:TESLA_CLIENT_SECRET
$DOMAIN = "unidling-doretha-unconcurrently.ngrok-free.dev"
$AUDIENCE = "https://fleet-api.prd.na.vn.cloud.tesla.com"

Write-Host "Registering partner account with Tesla Fleet API..." -ForegroundColor Cyan
Write-Host "Domain: $DOMAIN"
Write-Host ""

# Step 1: Get access token using client credentials
Write-Host "Step 1: Getting access token..." -ForegroundColor Yellow

$tokenBody = "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=openid vehicle_device_data vehicle_cmds&audience=$AUDIENCE"

try {
    $tokenResponse = Invoke-RestMethod -Uri "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token" `
        -Method Post `
        -Body $tokenBody `
        -ContentType "application/x-www-form-urlencoded"

    Write-Host "Access token obtained!" -ForegroundColor Green
    $accessToken = $tokenResponse.access_token
} catch {
    Write-Host "Failed to get access token:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
    exit 1
}

# Step 2: Register partner account
Write-Host ""
Write-Host "Step 2: Registering partner account..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$body = @{
    domain = $DOMAIN
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$AUDIENCE/api/1/partner_accounts" `
        -Method Post `
        -Headers $headers `
        -Body $body

    Write-Host ""
    Write-Host "SUCCESS! Partner account registered!" -ForegroundColor Green
    Write-Host ($registerResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Registration response:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next: Refresh your app and try logging in again!"
Write-Host "========================================" -ForegroundColor Cyan
