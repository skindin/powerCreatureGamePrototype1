Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Black background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$g.FillRectangle($bgBrush, 0, 0, 512, 512)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 10)
$transWhitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 255, 255, 255), 7)

# Motion lines left ball
$g.DrawLine($transWhitePen, 40, 215, 110, 215)
$g.DrawLine($whitePen, 60, 256, 130, 256)
$g.DrawLine($transWhitePen, 40, 297, 110, 297)

# Motion lines right ball
$g.DrawLine($transWhitePen, 472, 215, 402, 215)
$g.DrawLine($whitePen, 452, 256, 382, 256)
$g.DrawLine($transWhitePen, 472, 297, 402, 297)

# Left colliding ball
$g.FillEllipse($whiteBrush, 95, 176, 160, 160)

# Right colliding ball
$g.FillEllipse($whiteBrush, 257, 176, 160, 160)

# Collision shockwave / spark star in center
$pts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(256, 100),
    [System.Drawing.PointF]::new(272, 195),
    [System.Drawing.PointF]::new(345, 145),
    [System.Drawing.PointF]::new(290, 220),
    [System.Drawing.PointF]::new(375, 256),
    [System.Drawing.PointF]::new(290, 292),
    [System.Drawing.PointF]::new(345, 367),
    [System.Drawing.PointF]::new(272, 317),
    [System.Drawing.PointF]::new(256, 412),
    [System.Drawing.PointF]::new(240, 317),
    [System.Drawing.PointF]::new(167, 367),
    [System.Drawing.PointF]::new(222, 292),
    [System.Drawing.PointF]::new(137, 256),
    [System.Drawing.PointF]::new(222, 220),
    [System.Drawing.PointF]::new(167, 145),
    [System.Drawing.PointF]::new(240, 195)
)
$g.FillPolygon($whiteBrush, $pts)

# Dark cutouts inside impact center to match game-icons style
$g.FillEllipse($bgBrush, 236, 236, 40, 40)
$g.FillEllipse($whiteBrush, 246, 246, 20, 20)

$outPath = 'C:\Users\tealf\.gemini\antigravity-ide\brain\d7a2aeaa-b400-4406-8fa6-bbaaa2759893\icons\two_balls_colliding.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Generated two_balls_colliding.png successfully"
