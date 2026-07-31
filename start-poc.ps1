$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
$java = Join-Path $javaHome "bin\java.exe"

if (-not (Test-Path $java)) {
  Write-Error "Java 21 was not found at $java. Install Eclipse Temurin JDK 21 or update start-poc.ps1."
}

$backendJar = Join-Path $root "backend\target\ai-commerce-engine-0.1.0.jar"
if (-not (Test-Path $backendJar)) {
  Push-Location (Join-Path $root "backend")
  try {
    $env:JAVA_HOME = $javaHome
    $env:Path = "$javaHome\bin;$env:Path"
    & "C:\Program Files\apache-maven-3.9.9\bin\mvn.cmd" -s settings.xml package -DskipTests
  } finally {
    Pop-Location
  }
}

Start-Process -FilePath $java -ArgumentList "-jar", $backendJar -WorkingDirectory (Join-Path $root "backend") -WindowStyle Hidden
Start-Process -FilePath "npm.cmd" -ArgumentList "run start" -WorkingDirectory (Join-Path $root "frontend") -WindowStyle Hidden

Write-Host "Backend:  http://localhost:8080/api/v1/compare"
Write-Host "Swagger:  http://localhost:8080/swagger-ui.html"
Write-Host "Frontend: http://127.0.0.1:5175"
