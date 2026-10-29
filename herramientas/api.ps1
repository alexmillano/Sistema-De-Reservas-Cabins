# Ayudas para probar la API de Cabins desde PowerShell

if (-not $CabinsUrl) { $global:CabinsUrl = 'http://localhost:3000' }

# Uso: Api Get /api/cabanas
#      Api Post /api/carrito $cuerpo
# Manda el token que este guardado en la variable $token
function Api($metodo, $ruta, $cuerpo) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    if ($cuerpo) {
      $r = Invoke-RestMethod -Method $metodo -Uri "$CabinsUrl$ruta" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $cuerpo
    } else {
      $r = Invoke-RestMethod -Method $metodo -Uri "$CabinsUrl$ruta" -Headers $headers
    }
    $r | ForEach-Object { $_ }
  } catch {
    $detalle = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Host 'ERROR:' $detalle
  }
}

# Uso: $tokenAlex = Entrar alexmillano 123456
function Entrar([string]$identificador, [string]$password, [switch]$admin) {  
  $ruta = if ($admin) { '/api/auth/login-admin' } else { '/api/auth/login' }
  $cuerpo = @{ identificador = $identificador; password = $password } | ConvertTo-Json
  try {
    (Invoke-RestMethod -Method Post -Uri "$CabinsUrl$ruta" -ContentType 'application/json; charset=utf-8' -Body $cuerpo).token
  } catch {
    $detalle = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    Write-Host 'ERROR:' $detalle
  }
}

# Uso: $tokenAdmin = EntrarAdmin   (pide la contrasena sin mostrarla)
function EntrarAdmin($identificador = 'superadmin') {
  $segura = Read-Host "Contrasena de $identificador" -AsSecureString
  $plana = [System.Net.NetworkCredential]::new('', $segura).Password
  Entrar $identificador $plana -admin
}

# Uso: IdLoc 7 'Colonia Carlos Pellegrini'  (id de una localidad, buscada por nombre)
function IdLoc($provincia, $nombre) {
  $l = Api Get "/api/provincias/$provincia/localidades"
  $i = [array]::IndexOf(@($l.nombre), $nombre)
  if ($i -lt 0) { throw "No existe la localidad $nombre" }
  @($l.id)[$i]
}