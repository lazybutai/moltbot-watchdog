param(
  [int]$Port = 18789
)

$r = clawdbot gateway health 2>&1
if ($r -like "*OK*") {
  "OK"
  exit 0
}

try {
  $client = New-Object System.Net.Sockets.TcpClient
  $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
  if ($async.AsyncWaitHandle.WaitOne(2000, $false) -and $client.Connected) {
    $client.Close()
    "OK"
    exit 0
  }
  $client.Close()
} catch {
}

"FAIL"
