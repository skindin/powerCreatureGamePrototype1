Add-Type -AssemblyName System.Drawing

$srcDir = 'C:\Users\tealf\.gemini\antigravity-ide\brain\d7a2aeaa-b400-4406-8fa6-bbaaa2759893\rounded_icons'

# We can draw smooth rounded icons directly using System.Drawing to 512x512 PNGs:

function Draw-RoundApple($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $whitePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 22)
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Stem
    $g.DrawBezier($whitePen, 256, 85, 256, 55, 275, 35, 300, 30)

    # Leaf
    $leafPts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(260, 75),
        [System.Drawing.PointF]::new(310, 40),
        [System.Drawing.PointF]::new(360, 65),
        [System.Drawing.PointF]::new(350, 105),
        [System.Drawing.PointF]::new(300, 120)
    )
    $g.FillClosedCurve($white, $leafPts)

    # Plump Apple body
    $applePts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(256, 135),
        [System.Drawing.PointF]::new(350, 145),
        [System.Drawing.PointF]::new(420, 240),
        [System.Drawing.PointF]::new(390, 370),
        [System.Drawing.PointF]::new(340, 440),
        [System.Drawing.PointF]::new(256, 435),
        [System.Drawing.PointF]::new(172, 440),
        [System.Drawing.PointF]::new(122, 370),
        [System.Drawing.PointF]::new(92, 240),
        [System.Drawing.PointF]::new(162, 145)
    )
    $g.FillClosedCurve($white, $applePts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.6)

    # Smooth circular bite on the right
    $g.FillEllipse($bg, 305, 195, 145, 145)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundCollision($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $transWhite1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 255, 255, 255))
    $transWhite2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 255, 255, 255))

    # Capsule speed trails
    $trailPen1 = New-Object System.Drawing.Pen ($transWhite1, 20)
    $trailPen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen2 = New-Object System.Drawing.Pen ($transWhite2, 22)
    $trailPen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Left trails
    $g.DrawLine($trailPen1, 45, 215, 110, 215)
    $g.DrawLine($trailPen2, 65, 256, 140, 256)
    $g.DrawLine($trailPen1, 45, 297, 110, 297)

    # Right trails
    $g.DrawLine($trailPen1, 467, 215, 402, 215)
    $g.DrawLine($trailPen2, 447, 256, 372, 256)
    $g.DrawLine($trailPen1, 467, 297, 402, 297)

    # Left ball
    $g.FillEllipse($white, 105, 182, 148, 148)
    # Right ball
    $g.FillEllipse($white, 259, 182, 148, 148)

    # Rounded shock arcs top and bottom
    $arcPen = New-Object System.Drawing.Pen ($white, 16)
    $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $g.DrawArc($arcPen, 216, 140, 80, 80, 200, 140)
    $g.DrawArc($arcPen, 216, 292, 80, 80, 20, 140)

    # Center contact spark bead
    $g.FillEllipse($bg, 236, 236, 40, 40)
    $g.FillEllipse($white, 246, 246, 20, 20)

    # Upper and lower spark beads
    $g.FillEllipse($white, 246, 110, 20, 20)
    $g.FillEllipse($white, 246, 382, 20, 20)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundFlame($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    # Outer smooth curved flame
    $flamePts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(256, 50),
        [System.Drawing.PointF]::new(315, 150),
        [System.Drawing.PointF]::new(395, 260),
        [System.Drawing.PointF]::new(375, 400),
        [System.Drawing.PointF]::new(256, 465),
        [System.Drawing.PointF]::new(137, 400),
        [System.Drawing.PointF]::new(117, 260),
        [System.Drawing.PointF]::new(197, 150)
    )
    $g.FillClosedCurve($white, $flamePts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.6)

    # Inner teardrop flame cutout
    $innerPts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(256, 240),
        [System.Drawing.PointF]::new(295, 330),
        [System.Drawing.PointF]::new(256, 420),
        [System.Drawing.PointF]::new(217, 330)
    )
    $g.FillClosedCurve($bg, $innerPts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.6)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundCross($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $whitePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 88)
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Vertical capsule
    $g.DrawLine($whitePen, 256, 156, 256, 356)
    # Horizontal capsule
    $g.DrawLine($whitePen, 156, 256, 356, 256)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundHeart($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    $heartPts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(256, 435),
        [System.Drawing.PointF]::new(115, 320),
        [System.Drawing.PointF]::new(65, 210),
        [System.Drawing.PointF]::new(105, 110),
        [System.Drawing.PointF]::new(195, 95),
        [System.Drawing.PointF]::new(256, 160),
        [System.Drawing.PointF]::new(317, 95),
        [System.Drawing.PointF]::new(407, 110),
        [System.Drawing.PointF]::new(447, 210),
        [System.Drawing.PointF]::new(397, 320)
    )
    $g.FillClosedCurve($white, $heartPts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.5)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundPunch($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    # Main glove body
    $glovePts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(200, 140),
        [System.Drawing.PointF]::new(310, 115),
        [System.Drawing.PointF]::new(405, 185),
        [System.Drawing.PointF]::new(415, 280),
        [System.Drawing.PointF]::new(350, 365),
        [System.Drawing.PointF]::new(230, 375),
        [System.Drawing.PointF]::new(140, 335),
        [System.Drawing.PointF]::new(115, 255),
        [System.Drawing.PointF]::new(140, 175)
    )
    $g.FillClosedCurve($white, $glovePts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.6)

    # Thumb cutout
    $thumbPts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(165, 195),
        [System.Drawing.PointF]::new(225, 215),
        [System.Drawing.PointF]::new(215, 290),
        [System.Drawing.PointF]::new(155, 270)
    )
    $g.FillClosedCurve($bg, $thumbPts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.6)

    # Rounded wrist cuff
    $cuffPen = New-Object System.Drawing.Pen ($white, 38)
    $cuffPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $cuffPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($cuffPen, 100, 360, 170, 360)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundAura($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

    $ringPen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 20)
    $ringPen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringPen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $ringPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(190, 255, 255, 255), 24)
    $ringPen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringPen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Outer smooth arcs
    $g.DrawArc($ringPen1, 86, 86, 340, 340, 25, 60)
    $g.DrawArc($ringPen1, 86, 86, 340, 340, 115, 60)
    $g.DrawArc($ringPen1, 86, 86, 340, 340, 205, 60)
    $g.DrawArc($ringPen1, 86, 86, 340, 340, 295, 60)

    # Mid smooth arcs
    $g.DrawArc($ringPen2, 141, 141, 230, 230, 5, 80)
    $g.DrawArc($ringPen2, 141, 141, 230, 230, 95, 80)
    $g.DrawArc($ringPen2, 141, 141, 230, 230, 185, 80)
    $g.DrawArc($ringPen2, 141, 141, 230, 230, 275, 80)

    # Inner glowing core
    $g.FillEllipse($white, 206, 206, 100, 100)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundSprint($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $trailPen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 18)
    $trailPen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(190, 255, 255, 255), 22)
    $trailPen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $trailPen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Pill speed lines
    $g.DrawLine($trailPen1, 50, 200, 130, 200)
    $g.DrawLine($trailPen2, 30, 245, 150, 245)
    $g.DrawLine($trailPen1, 65, 290, 140, 290)

    # Rounded sneaker
    $shoePts = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(210, 160),
        [System.Drawing.PointF]::new(265, 190),
        [System.Drawing.PointF]::new(280, 235),
        [System.Drawing.PointF]::new(360, 260),
        [System.Drawing.PointF]::new(435, 300),
        [System.Drawing.PointF]::new(450, 350),
        [System.Drawing.PointF]::new(430, 395),
        [System.Drawing.PointF]::new(180, 395),
        [System.Drawing.PointF]::new(150, 345),
        [System.Drawing.PointF]::new(155, 240),
        [System.Drawing.PointF]::new(175, 180)
    )
    $g.FillClosedCurve($white, $shoePts, [System.Drawing.Drawing2D.FillMode]::Winding, 0.45)

    # Sole cutout
    $solePen = New-Object System.Drawing.Pen ($bg, 20)
    $solePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $solePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($solePen, 180, 380, 420, 380)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundJump($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $whitePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 26)
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Upward rounded chevron
    $g.DrawLines($whitePen, [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(180, 160),
        [System.Drawing.PointF]::new(256, 95),
        [System.Drawing.PointF]::new(332, 160)
    ))

    # Bouncing spring coils
    $springPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 24)
    $springPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $springPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($springPen, 195, 205, 122, 60, 180, 360)
    $g.DrawArc($springPen, 195, 260, 122, 60, 0, 360)
    $g.DrawArc($springPen, 195, 315, 122, 60, 0, 360)

    # Base ground bar
    $basePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 24)
    $basePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $basePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($basePen, 175, 415, 337, 415)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundThrow($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $arcPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 22)
    $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arcPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $arcPen.DashPattern = @(1.8, 1.2)

    # Parabolic trajectory curve
    $g.DrawBezier($arcPen, 85, 400, 130, 180, 280, 140, 380, 185)

    # Origin launching pedestal
    $g.FillEllipse($white, 65, 385, 40, 40)

    # Launched Projectile Ball with soft speed halo
    $haloPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 255, 255, 255), 14)
    $g.DrawEllipse($haloPen, 320, 125, 120, 120)
    $g.FillEllipse($white, 335, 140, 90, 90)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Draw-RoundClimb($path) {
    $bmp = New-Object System.Drawing.Bitmap 512, 512
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bg, 0, 0, 512, 512)

    $railPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 30)
    $railPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $railPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $rungPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 24)
    $rungPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $rungPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Ladder side rails
    $g.DrawLine($railPen, 180, 85, 180, 425)
    $g.DrawLine($railPen, 332, 85, 332, 425)

    # Rounded rungs
    $g.DrawLine($rungPen, 185, 145, 327, 145)
    $g.DrawLine($rungPen, 185, 225, 327, 225)
    $g.DrawLine($rungPen, 185, 305, 327, 305)
    $g.DrawLine($rungPen, 185, 385, 327, 385)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Draw-RoundApple (Join-Path $srcDir 'apple_rounded.png')
Draw-RoundCollision (Join-Path $srcDir 'collision_rounded.png')
Draw-RoundFlame (Join-Path $srcDir 'flame_rounded.png')
Draw-RoundCross (Join-Path $srcDir 'heal_cross_rounded.png')
Draw-RoundHeart (Join-Path $srcDir 'heart_rounded.png')
Draw-RoundPunch (Join-Path $srcDir 'punch_rounded.png')
Draw-RoundAura (Join-Path $srcDir 'aura_rounded.png')
Draw-RoundSprint (Join-Path $srcDir 'sprint_rounded.png')
Draw-RoundJump (Join-Path $srcDir 'jump_rounded.png')
Draw-RoundThrow (Join-Path $srcDir 'throw_rounded.png')
Draw-RoundClimb (Join-Path $srcDir 'climb_rounded.png')

Write-Host "Rendered all 11 rounded PNGs successfully!"
