# Android Build Script
# This script builds the Android app while skipping expo-modules-core CMake tasks
# that cause C++ linking errors, but allowing React Native core CMake tasks

Write-Host "Building Android app (x86_64 only, skipping expo-modules-core CMake)..." -ForegroundColor Cyan

Push-Location android

# Build with x86_64 only
$gradleArgs = @(
    "app:assembleDebug",
    "-PreactNativeArchitectures=x86_64",
    "-PreactNativeDevServerPort=8081"
)

# Skip ALL CMake tasks (they have C++ linking issues with libc++)
# This is a workaround - the app may have limited functionality
Write-Host "Skipping ALL CMake tasks (C++ linking issues)..." -ForegroundColor Yellow
Write-Host "WARNING: This may cause native modules to not work properly!" -ForegroundColor Red
.\gradlew.bat $gradleArgs `
    -x :expo-modules-core:configureCMakeDebug[x86_64] `
    -x :expo-modules-core:buildCMakeDebug[x86_64] `
    -x :app:configureCMakeDebug[x86_64] `
    -x :app:buildCMakeDebug[x86_64]

$buildSuccess = $LASTEXITCODE -eq 0

Pop-Location

if ($buildSuccess) {
    Write-Host "Build successful!" -ForegroundColor Green
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "APK location: $apkPath" -ForegroundColor Yellow
    
    # Check if emulator is running
    $devices = & "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" devices
    if ($devices -match "emulator") {
        Write-Host "Installing APK on emulator..." -ForegroundColor Cyan
        & "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "APK installed successfully!" -ForegroundColor Green
        }
    } else {
        Write-Host "No emulator detected. Start an emulator and run:" -ForegroundColor Yellow
        Write-Host "  adb install $apkPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
