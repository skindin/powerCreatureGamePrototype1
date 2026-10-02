using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace desktop_app;

public partial class Form1 : Form
{
    private WebView2 webView = null!;
    private Panel topBar = null!;
    private Panel loadingPanel = null!;
    private Label titleLabel = null!;
    private Label statusLabel = null!;
    private Button btnPublicLink = null!;
    private Button btnOpenPublic = null!;
    private Button btnToggleTunnel = null!;
    private Button btnCopyLink = null!;
    private Button btnViewSettings = null!;
    private Button btnReload = null!;
    private Button btnFullscreen = null!;
    private Button btnDevTools = null!;
    private Button btnBrowser = null!;
    private ToolTip toolTip = null!;

    private Process? serverProcess = null;
    private Process? tunnelProcess = null;
    private string? publicTunnelUrl = null;
    private string projectDir = "";
    private int currentPort = 5173;
    private string activeUrl = "http://localhost:5173/";
    private bool isFullscreen = false;
    private string ephemeralUserDataFolder = "";
    private FormWindowState previousWindowState = FormWindowState.Normal;
    private FormBorderStyle previousBorderStyle = FormBorderStyle.Sizable;

    public Form1()
    {
        InitializeComponent();
        projectDir = FindProjectDirectory();
        toolTip = new ToolTip { InitialDelay = 300, ReshowDelay = 150 };
        SetupCustomUI();
        this.Shown += async (s, e) => await InitializeGameAppAsync();
        this.FormClosing += (s, e) => CleanupServer();
        this.KeyPreview = true;
        this.KeyDown += Form1_KeyDown;
    }

    private void SetupCustomUI()
    {
        this.Text = "Power Creature Game - Prototype 1";
        this.Size = new Size(1380, 860);
        this.MinimumSize = new Size(1000, 700);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(11, 15, 25); // #0b0f19

        // Load Icon
        try
        {
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            if (File.Exists(iconPath))
            {
                this.Icon = new Icon(iconPath);
            }
        }
        catch { }

        // Top Navigation / Header Bar
        topBar = new Panel
        {
            Dock = DockStyle.Top,
            Height = 44,
            BackColor = Color.FromArgb(15, 23, 42), // #0f172a
            Padding = new Padding(14, 0, 14, 0)
        };

        // Title Label
        titleLabel = new Label
        {
            Text = "⚡ Power Creature Game",
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(14, 11)
        };
        topBar.Controls.Add(titleLabel);

        // Status Label
        statusLabel = new Label
        {
            Text = "🟡 Initializing...",
            Font = new Font("Segoe UI", 9f, FontStyle.Regular),
            ForeColor = Color.FromArgb(253, 224, 71),
            AutoSize = true,
            Location = new Point(230, 12)
        };
        topBar.Controls.Add(statusLabel);

        // Action Buttons on Right
        var buttonFlow = new FlowLayoutPanel
        {
            Dock = DockStyle.Right,
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            Padding = new Padding(0, 7, 0, 0)
        };

        // Public Link Display Button (prominently displays https://pcg-arena-teal.loca.lt)
        btnPublicLink = CreateHeaderButton("🌐 https://pcg-arena-teal.loca.lt", async (s, e) => await CopyLinkAsync());
        btnPublicLink.ForeColor = Color.FromArgb(56, 189, 248);
        btnPublicLink.BackColor = Color.FromArgb(15, 23, 42);
        btnPublicLink.FlatAppearance.BorderColor = Color.FromArgb(56, 189, 248);
        toolTip.SetToolTip(btnPublicLink, "Click to copy permanent nationwide link: https://pcg-arena-teal.loca.lt");

        btnOpenPublic = CreateHeaderButton("↗ Open", (s, e) => OpenPublicUrl());
        btnOpenPublic.ForeColor = Color.FromArgb(203, 213, 225);
        toolTip.SetToolTip(btnOpenPublic, "Open https://pcg-arena-teal.loca.lt in default web browser");

        // Public Tunnel Toggle Button
        btnToggleTunnel = CreateHeaderButton("🌐 Tunnel: ON", async (s, e) => await ToggleTunnelAsync());
        btnToggleTunnel.ForeColor = Color.FromArgb(74, 222, 128);
        btnToggleTunnel.BackColor = Color.FromArgb(20, 83, 45);
        btnToggleTunnel.FlatAppearance.BorderColor = Color.FromArgb(34, 197, 94);
        toolTip.SetToolTip(btnToggleTunnel, "Click to turn public tunnel ON or OFF");

        // Copy Link Button
        btnCopyLink = CreateHeaderButton("📋 Copy", async (s, e) => await CopyLinkAsync());
        btnCopyLink.ForeColor = Color.FromArgb(56, 189, 248);
        btnCopyLink.Visible = true;

        btnViewSettings = CreateHeaderButton("👁 View", async (s, e) =>
        {
            if (webView?.CoreWebView2 != null)
            {
                await webView.ExecuteScriptAsync("document.getElementById('toggle-view-settings-btn')?.click()");
            }
        });
        toolTip.SetToolTip(btnViewSettings, "Toggle 3D View Settings (V)");

        btnReload = CreateHeaderButton("🔄 Reload", (s, e) => webView?.Reload());
        btnFullscreen = CreateHeaderButton("⛶ Fullscreen", (s, e) => ToggleFullscreen());
        btnDevTools = CreateHeaderButton("🛠 DevTools", (s, e) => webView?.CoreWebView2?.OpenDevToolsWindow());
        btnBrowser = CreateHeaderButton("🌐 Browser", (s, e) => OpenInBrowser());

        toolTip.SetToolTip(btnReload, "Reload the game (F5)");
        toolTip.SetToolTip(btnFullscreen, "Toggle fullscreen (F11)");
        toolTip.SetToolTip(btnDevTools, "Open DevTools inspect window (F12)");
        toolTip.SetToolTip(btnBrowser, "Open http://localhost:5173 in your default web browser");

        buttonFlow.Controls.Add(btnPublicLink);
        buttonFlow.Controls.Add(btnOpenPublic);
        buttonFlow.Controls.Add(btnToggleTunnel);
        buttonFlow.Controls.Add(btnCopyLink);
        buttonFlow.Controls.Add(btnViewSettings);
        buttonFlow.Controls.Add(btnReload);
        buttonFlow.Controls.Add(btnFullscreen);
        buttonFlow.Controls.Add(btnDevTools);
        buttonFlow.Controls.Add(btnBrowser);
        topBar.Controls.Add(buttonFlow);

        // Add webView first so DockStyle.Fill takes the remaining area
        webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(11, 15, 25),
            Visible = false
        };
        this.Controls.Add(webView);

        // Add topBar so it docks cleanly to the top without stealing client margins
        this.Controls.Add(topBar);

        // Loading Overlay Panel
        loadingPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(11, 15, 25)
        };

        var loadBox = new Panel
        {
            Size = new Size(420, 180),
            BackColor = Color.FromArgb(15, 23, 42),
            BorderStyle = BorderStyle.FixedSingle
        };
        loadBox.Location = new Point((this.ClientSize.Width - loadBox.Width) / 2, (this.ClientSize.Height - loadBox.Height) / 2);
        loadBox.Anchor = AnchorStyles.None;

        var lblSplashTitle = new Label
        {
            Text = "⚡ Power Creature Prototype 1",
            Font = new Font("Segoe UI", 14f, FontStyle.Bold),
            ForeColor = Color.FromArgb(56, 189, 248),
            TextAlign = ContentAlignment.MiddleCenter,
            Dock = DockStyle.Top,
            Height = 55
        };

        var lblSplashMsg = new Label
        {
            Text = "Connecting to game physics engine...",
            Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
            ForeColor = Color.FromArgb(203, 213, 225),
            TextAlign = ContentAlignment.MiddleCenter,
            Dock = DockStyle.Top,
            Height = 35
        };

        var progressBar = new ProgressBar
        {
            Style = ProgressBarStyle.Marquee,
            MarqueeAnimationSpeed = 30,
            Height = 8,
            Dock = DockStyle.Bottom
        };

        loadBox.Controls.Add(lblSplashMsg);
        loadBox.Controls.Add(lblSplashTitle);
        loadBox.Controls.Add(progressBar);
        loadingPanel.Controls.Add(loadBox);
        this.Controls.Add(loadingPanel);
        loadingPanel.BringToFront();
    }

    private Button CreateHeaderButton(string text, EventHandler onClick)
    {
        var btn = new Button
        {
            Text = text,
            Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
            ForeColor = Color.FromArgb(226, 232, 240),
            BackColor = Color.FromArgb(30, 41, 59),
            FlatStyle = FlatStyle.Flat,
            Height = 28,
            AutoSize = true,
            Cursor = Cursors.Hand,
            Margin = new Padding(4, 0, 4, 0)
        };
        btn.FlatAppearance.BorderSize = 1;
        btn.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
        btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(51, 65, 85);
        btn.Click += onClick;
        return btn;
    }

    private async Task InitializeGameAppAsync()
    {
        statusLabel.Text = "🟡 Starting server...";

        // 1. Check if server is running; if not, launch it
        int activePort = 5173;
        bool isRunning = IsServerReady(out activePort);

        if (!isRunning)
        {
            StartBackgroundServer(projectDir);
            int attempts = 0;
            while (!IsServerReady(out activePort) && attempts < 40)
            {
                await Task.Delay(300);
                attempts++;
            }
        }

        currentPort = activePort;
        activeUrl = $"http://localhost:{activePort}/";
        statusLabel.Text = $"🟢 Online (Port {activePort})";
        statusLabel.ForeColor = Color.FromArgb(74, 222, 128);

        // 2. Initialize WebView2 with zero persistent cache (ephemeral isolated profile)
        try
        {
            // Use an isolated ephemeral folder per instance so no persistent cache can ever linger
            ephemeralUserDataFolder = Path.Combine(Path.GetTempPath(), $"PowerCreatureGame_Session_{Guid.NewGuid():N}");
            Directory.CreateDirectory(ephemeralUserDataFolder);

            // Pass chromium flags to completely disable HTTP and disk caches
            var options = new CoreWebView2EnvironmentOptions("--disable-http-cache --disable-cache --disk-cache-size=0 --disable-application-cache");
            var env = await CoreWebView2Environment.CreateAsync(null, ephemeralUserDataFolder, options);
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;

            // Clear all browsing data kinds on startup
            try
            {
                await webView.CoreWebView2.Profile.ClearBrowsingDataAsync(
                    CoreWebView2BrowsingDataKinds.DiskCache |
                    CoreWebView2BrowsingDataKinds.ServiceWorkers |
                    CoreWebView2BrowsingDataKinds.CacheStorage |
                    CoreWebView2BrowsingDataKinds.IndexedDb |
                    CoreWebView2BrowsingDataKinds.WebSql
                );
            }
            catch { }

            webView.NavigationCompleted += (s, e) =>
            {
                loadingPanel.Visible = false;
                webView.Visible = true;
                if (Form.ActiveForm == this)
                {
                    webView.Focus();
                }
            };

            // Force cache busting timestamp on initial load URL to bypass any internal intermediary caches
            string cacheBustUrl = activeUrl + (activeUrl.Contains("?") ? "&" : "?") + $"_v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            webView.CoreWebView2.Navigate(cacheBustUrl);

            // Auto-start nationwide public tunnel so https://pcg-arena-teal.loca.lt is immediately live
            _ = StartTunnelAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to initialize WebView2:\n{ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async Task ToggleTunnelAsync()
    {
        if (tunnelProcess != null && !tunnelProcess.HasExited)
        {
            StopTunnel();
        }
        else
        {
            await StartTunnelAsync();
        }
    }

    private async Task StartTunnelAsync()
    {
        btnToggleTunnel.Enabled = false;
        btnToggleTunnel.Text = "⏳ Starting Tunnel...";
        btnToggleTunnel.ForeColor = Color.FromArgb(253, 224, 71);
        statusLabel.Text = "🟡 Opening tunnel...";

        try
        {
            string nodeDir = @"C:\Program Files\nodejs";
            string currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            if (!currentPath.Contains(nodeDir) && Directory.Exists(nodeDir))
            {
                currentPath = nodeDir + ";" + currentPath;
            }

            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c npx localtunnel --port {currentPort} --subdomain pcg-arena-teal --local-host localhost",
                WorkingDirectory = projectDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            psi.EnvironmentVariables["PATH"] = currentPath;

            tunnelProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };

            var tcsUrl = new TaskCompletionSource<string>();

            tunnelProcess.OutputDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(args.Data, @"https://[^\s]+\.loca\.lt");
                    if (match.Success)
                    {
                        tcsUrl.TrySetResult(match.Value);
                    }
                }
            };

            tunnelProcess.Exited += (sender, args) =>
            {
                try
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke(() =>
                        {
                            if (tunnelProcess != null)
                            {
                                StopTunnel();
                            }
                        });
                    }
                }
                catch { }
            };

            tunnelProcess.Start();
            tunnelProcess.BeginOutputReadLine();
            tunnelProcess.BeginErrorReadLine();

            var completedTask = await Task.WhenAny(tcsUrl.Task, Task.Delay(15000));
            if (completedTask == tcsUrl.Task)
            {
                publicTunnelUrl = "https://pcg-arena-teal.loca.lt";
                btnToggleTunnel.Text = "🌐 Tunnel: ON";
                btnToggleTunnel.ForeColor = Color.FromArgb(74, 222, 128);
                btnToggleTunnel.BackColor = Color.FromArgb(20, 83, 45);
                btnToggleTunnel.FlatAppearance.BorderColor = Color.FromArgb(34, 197, 94);
                btnToggleTunnel.Enabled = true;

                btnPublicLink.Text = "🌐 https://pcg-arena-teal.loca.lt";
                btnPublicLink.ForeColor = Color.FromArgb(56, 189, 248);

                btnCopyLink.Visible = true;
                toolTip.SetToolTip(btnToggleTunnel, $"Public link: {publicTunnelUrl}\nClick to turn OFF");
                toolTip.SetToolTip(btnCopyLink, $"Copy public link:\n{publicTunnelUrl}");

                statusLabel.Text = $"🟢 Online ({currentPort}) | 🌐 Public: Active";

                // Automatically copy to clipboard
                try { Clipboard.SetText(publicTunnelUrl); } catch { }

                // Sync with public/tunnel.json and dist/tunnel.json so in-game UI has the live link
                try
                {
                    string tunnelJson = Path.Combine(projectDir, "public", "tunnel.json");
                    Directory.CreateDirectory(Path.GetDirectoryName(tunnelJson)!);
                    File.WriteAllText(tunnelJson, $"{{\"active\":true,\"url\":\"{publicTunnelUrl}\"}}");

                    string distTunnelJson = Path.Combine(projectDir, "dist", "tunnel.json");
                    if (Directory.Exists(Path.GetDirectoryName(distTunnelJson)!))
                    {
                        File.WriteAllText(distTunnelJson, $"{{\"active\":true,\"url\":\"{publicTunnelUrl}\"}}");
                    }
                }
                catch { }
            }
            else
            {
                StopTunnel();
            }
        }
        catch (Exception)
        {
            StopTunnel();
        }
        finally
        {
            btnToggleTunnel.Enabled = true;
        }
    }

    private void StopTunnel()
    {
        if (tunnelProcess != null)
        {
            try
            {
                if (!tunnelProcess.HasExited)
                {
                    Process.Start(new ProcessStartInfo("taskkill", $"/F /T /PID {tunnelProcess.Id}")
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    })?.WaitForExit(2000);
                }
            }
            catch { }
            finally
            {
                try { tunnelProcess.Dispose(); } catch { }
                tunnelProcess = null;
            }
        }

        try
        {
            string tunnelJson = Path.Combine(projectDir, "public", "tunnel.json");
            File.WriteAllText(tunnelJson, "{\"active\":false,\"url\":\"https://pcg-arena-teal.loca.lt\"}");

            string distTunnelJson = Path.Combine(projectDir, "dist", "tunnel.json");
            if (Directory.Exists(Path.GetDirectoryName(distTunnelJson)!))
            {
                File.WriteAllText(distTunnelJson, "{\"active\":false,\"url\":\"https://pcg-arena-teal.loca.lt\"}");
            }
        }
        catch { }

        publicTunnelUrl = null;
        btnToggleTunnel.Text = "🌐 Tunnel: OFF";
        btnToggleTunnel.ForeColor = Color.FromArgb(148, 163, 184);
        btnToggleTunnel.BackColor = Color.FromArgb(30, 41, 59);
        btnToggleTunnel.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
        btnToggleTunnel.Enabled = true;

        btnPublicLink.Text = "🌐 https://pcg-arena-teal.loca.lt (Standby)";
        btnPublicLink.ForeColor = Color.FromArgb(148, 163, 184);

        toolTip.SetToolTip(btnToggleTunnel, "Click to start the nationwide public tunnel URL");
        statusLabel.Text = $"🟢 Online (Port {currentPort})";
    }

    private void OpenPublicUrl()
    {
        try
        {
            Process.Start(new ProcessStartInfo("https://pcg-arena-teal.loca.lt") { UseShellExecute = true });
        }
        catch { }
    }

    private async Task CopyLinkAsync()
    {
        string url = "https://pcg-arena-teal.loca.lt";
        try
        {
            Clipboard.SetText(url);
            btnPublicLink.Text = "✅ Copied Public Link!";
            btnPublicLink.ForeColor = Color.FromArgb(74, 222, 128);
            btnCopyLink.Text = "✅ Copied!";
            btnCopyLink.ForeColor = Color.FromArgb(74, 222, 128);

            await Task.Delay(1500);

            btnPublicLink.Text = "🌐 https://pcg-arena-teal.loca.lt";
            btnPublicLink.ForeColor = Color.FromArgb(56, 189, 248);
            btnCopyLink.Text = "📋 Copy";
            btnCopyLink.ForeColor = Color.FromArgb(56, 189, 248);
        }
        catch { }
    }

    private string FindProjectDirectory()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        for (int i = 0; i < 5; i++)
        {
            if (File.Exists(Path.Combine(dir, "package.json")))
            {
                return dir;
            }
            string? parent = Directory.GetParent(dir)?.FullName;
            if (parent == null) break;
            dir = parent;
        }
        return AppDomain.CurrentDomain.BaseDirectory;
    }

    private void StartBackgroundServer(string projectDir)
    {
        try
        {
            string nodeDir = @"C:\Program Files\nodejs";
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                WorkingDirectory = projectDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };

            string currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            if (Directory.Exists(nodeDir) && !currentPath.Contains(nodeDir))
            {
                currentPath = nodeDir + ";" + currentPath;
            }
            psi.EnvironmentVariables["PATH"] = currentPath;

            if (File.Exists(Path.Combine(nodeDir, "npm.cmd")))
            {
                psi.Arguments = $"/c \"{Path.Combine(nodeDir, "npm.cmd")}\" run dev";
            }
            else
            {
                psi.Arguments = "/c npm run dev";
            }

            serverProcess = Process.Start(psi);
        }
        catch (Exception ex)
        {
            Debug.WriteLine("Failed to launch npm dev server: " + ex.Message);
        }
    }

    private bool IsServerReady(out int detectedPort)
    {
        int[] ports = { 5173, 5174, 5175, 5176 };
        foreach (int p in ports)
        {
            if (TryConnect(p))
            {
                detectedPort = p;
                return true;
            }
        }
        detectedPort = 5173;
        return false;
    }

    private bool TryConnect(int port)
    {
        try
        {
#pragma warning disable SYSLIB0014
            var req = (HttpWebRequest)WebRequest.Create($"http://localhost:{port}/");
            req.Timeout = 300;
            req.Method = "HEAD";
            using (var resp = req.GetResponse())
            {
                return true;
            }
#pragma warning restore SYSLIB0014
        }
        catch (WebException ex)
        {
            if (ex.Response != null) return true;
        }
        catch { }

        try
        {
            using (var client = new TcpClient())
            {
                var result = client.BeginConnect("127.0.0.1", port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(200));
                if (success)
                {
                    client.EndConnect(result);
                    return true;
                }
            }
        }
        catch { }

        return false;
    }

    private void ToggleFullscreen()
    {
        if (!isFullscreen)
        {
            previousWindowState = this.WindowState;
            previousBorderStyle = this.FormBorderStyle;
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            topBar.Visible = false; // Immersive full screen
            isFullscreen = true;
        }
        else
        {
            this.FormBorderStyle = previousBorderStyle;
            this.WindowState = previousWindowState;
            topBar.Visible = true;
            isFullscreen = false;
        }
    }

    private void OpenInBrowser()
    {
        try
        {
            Process.Start(new ProcessStartInfo(activeUrl) { UseShellExecute = true });
        }
        catch { }
    }

    private void Form1_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F11)
        {
            ToggleFullscreen();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R))
        {
            webView?.Reload();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.F12)
        {
            webView?.CoreWebView2?.OpenDevToolsWindow();
            e.Handled = true;
        }
    }

    private void CleanupServer()
    {
        StopTunnel();
        if (serverProcess != null && !serverProcess.HasExited)
        {
            try
            {
                Process.Start(new ProcessStartInfo("taskkill", $"/F /T /PID {serverProcess.Id}")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }
            catch { }
        }

        // Delete ephemeral WebView2 folder on exit to guarantee zero persistent cache
        if (!string.IsNullOrEmpty(ephemeralUserDataFolder) && Directory.Exists(ephemeralUserDataFolder))
        {
            Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(800);
                    Directory.Delete(ephemeralUserDataFolder, true);
                }
                catch { }
            });
        }
    }
}
