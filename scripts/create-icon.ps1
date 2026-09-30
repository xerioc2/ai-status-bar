# Original project artwork: a status monitor and pulse, with no provider branding.
# Run on Windows to regenerate the checked-in 256px Marketplace PNG.
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$background = [System.Drawing.ColorTranslator]::FromHtml('#162A3A')
$graphics.Clear($background)
$pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#76E0CC')), 12
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$frame = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#EDF5FA')), 9
$graphics.DrawRectangle($frame, 33, 47, 190, 142)
$points = [System.Drawing.Point[]]@(
  (New-Object System.Drawing.Point 57, 124),
  (New-Object System.Drawing.Point 90, 124),
  (New-Object System.Drawing.Point 110, 87),
  (New-Object System.Drawing.Point 142, 156),
  (New-Object System.Drawing.Point 165, 114),
  (New-Object System.Drawing.Point 198, 114)
)
$graphics.DrawLines($pen, $points)
$graphics.DrawLine($frame, 101, 212, 155, 212)
$bitmap.Save((Join-Path $PSScriptRoot '../resources/icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$frame.Dispose()
$pen.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
