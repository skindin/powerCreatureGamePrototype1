using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.Json;
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
    private Button btnPushData = null!;
    private Button btnRefreshClient = null!;
    private Button btnResetMatch = null!;
    private Button btnSyncNewCode = null!;
    private Button btnFullscreen = null!;
    private Button btnDevTools = null!;
    private Button btnBrowser = null!;
    private ToolTip toolTip = null!;

    private Process? serverProcess = null;
    private Process? tunnelProcess = null;
    private string? publicTunnelUrl = null;
    private string projectDir = "";
    private int currentPort = 3000;
    private string activeUrl = "http://localhost:3000/?isolated=1";
    private bool isFullscreen = false;
    private string ephemeralUserDataFolder = "";
    private FormWindowState previousWindowState = FormWindowState.Normal;
    private FormBorderStyle previousBorderStyle = FormBorderStyle.Sizable;

    private string bootCommit = "";
    private string latestCommit = "";
    private bool isDataModified = false;
    private int unpushedCommitsCount = 0;
    private System.Windows.Forms.Timer? gitPollTimer = null;

    private static readonly HttpClient devClient = new HttpClient(new SocketsHttpHandler
    {
        UseProxy = false,
        ConnectTimeout = TimeSpan.FromMilliseconds(500),
        PooledConnectionLifetime = TimeSpan.FromMinutes(15)
    })
    {
        Timeout = TimeSpan.FromSeconds(35)
    };

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

        btnPushData = CreateHeaderButton("💾 Push Data", async (s, e) => await HandlePushDataClickAsync());
        btnPushData.ForeColor = Color.FromArgb(148, 163, 184);
        toolTip.SetToolTip(btnPushData, "Commit and push worldConfig.json data changes to GitHub");

        btnRefreshClient = CreateHeaderButton("🔄 Refresh Client", (s, e) => HandleRefreshClientClick());
        btnRefreshClient.ForeColor = Color.FromArgb(203, 213, 225);
        toolTip.SetToolTip(btnRefreshClient, "Refreshes only the client UI/view (F5), exactly like browser refresh. Server keeps running.");

        btnResetMatch = CreateHeaderButton("⚡ Reset Match", async (s, e) => await HandleResetMatchClickAsync());
        btnResetMatch.ForeColor = Color.FromArgb(250, 204, 21);
        toolTip.SetToolTip(btnResetMatch, "Resets server room & physical arena to initial spawn state, keeping current code.");

        btnSyncNewCode = CreateHeaderButton("🚀 Sync New Code", async (s, e) => await HandleSyncNewCodeClickAsync());
        btnSyncNewCode.ForeColor = Color.FromArgb(56, 189, 248);
        toolTip.SetToolTip(btnSyncNewCode, "Rebuilds client & server bundles with latest code from disk and reloads both");

        btnFullscreen = CreateHeaderButton("⛶ Fullscreen", (s, e) => ToggleFullscreen());
        btnDevTools = CreateHeaderButton("🛠 DevTools", (s, e) => webView?.CoreWebView2?.OpenDevToolsWindow());
        btnBrowser = CreateHeaderButton("🌐 Browser", (s, e) => OpenInBrowser());

        toolTip.SetToolTip(btnFullscreen, "Toggle fullscreen (F11)");
        toolTip.SetToolTip(btnDevTools, "Open DevTools inspect window (F12)");
        toolTip.SetToolTip(btnBrowser, "Open http://localhost:3000 in your default web browser");

        buttonFlow.Controls.Add(btnPublicLink);
        buttonFlow.Controls.Add(btnOpenPublic);
        buttonFlow.Controls.Add(btnToggleTunnel);
        buttonFlow.Controls.Add(btnCopyLink);
        buttonFlow.Controls.Add(btnViewSettings);
        buttonFlow.Controls.Add(btnPushData);
        buttonFlow.Controls.Add(btnRefreshClient);
        buttonFlow.Controls.Add(btnResetMatch);
        buttonFlow.Controls.Add(btnSyncNewCode);
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
        int activePort = 3000;
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
        activeUrl = $"http://localhost:{activePort}/?isolated=1";
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
                statusLabel.Text = $"🟢 Online (Port {currentPort})";
                statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
                if (Form.ActiveForm == this)
                {
                    webView.Focus();
                }
            };

            // Force cache busting timestamp on initial load URL to bypass any internal intermediary caches
            string cacheBustUrl = activeUrl + (activeUrl.Contains("?") ? "&" : "?") + $"_v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            webView.CoreWebView2.Navigate(cacheBustUrl);

            // Start background Git status polling every 4 seconds
            gitPollTimer = new System.Windows.Forms.Timer { Interval = 4000 };
            gitPollTimer.Tick += async (s, e) => await CheckGitStatusAsync();
            gitPollTimer.Start();
            _ = CheckGitStatusAsync(isInitialBoot: true);

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
        int[] ports = { 3000, 5173, 5174, 5175, 5176 };
        foreach (int p in ports)
        {
            if (TryConnect(p))
            {
                detectedPort = p;
                return true;
            }
        }
        detectedPort = 3000;
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
            HandleRefreshClientClick();
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
        gitPollTimer?.Stop();
        gitPollTimer?.Dispose();
        gitPollTimer = null;

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

    private async Task CheckGitStatusAsync(bool isInitialBoot = false)
    {
        if (currentPort <= 0) return;
        try
        {
            var resp = await devClient.GetAsync($"http://127.0.0.1:{currentPort}/api/dev/git-status");
            if (!resp.IsSuccessStatusCode) return;

            var jsonStr = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(jsonStr);
            var root = doc.RootElement;

            if (root.TryGetProperty("headCommit", out var hc))
            {
                string head = hc.GetString() ?? "";
                if (isInitialBoot && string.IsNullOrEmpty(bootCommit))
                {
                    bootCommit = head;
                }
                latestCommit = head;
            }

            if (root.TryGetProperty("dataModified", out var dm))
            {
                isDataModified = dm.GetBoolean();
            }

            if (root.TryGetProperty("aheadCount", out var ac))
            {
                unpushedCommitsCount = ac.GetInt32();
            }

            if (this.IsHandleCreated && !this.IsDisposed)
            {
                this.BeginInvoke(() =>
                {
                    if (isDataModified)
                    {
                        btnPushData.Text = "💾 Push Data (Unsaved)";
                        btnPushData.ForeColor = Color.FromArgb(253, 224, 71);
                        btnPushData.FlatAppearance.BorderColor = Color.FromArgb(234, 179, 8);
                        btnPushData.BackColor = Color.FromArgb(40, 35, 15);
                        toolTip.SetToolTip(btnPushData, "You have unsaved changes in worldConfig.json. Click to commit & push to GitHub.");
                    }
                    else if (unpushedCommitsCount > 0)
                    {
                        btnPushData.Text = $"💾 Push Data ({unpushedCommitsCount} ahead)";
                        btnPushData.ForeColor = Color.FromArgb(74, 222, 128);
                        btnPushData.FlatAppearance.BorderColor = Color.FromArgb(34, 197, 94);
                        btnPushData.BackColor = Color.FromArgb(20, 45, 25);
                        toolTip.SetToolTip(btnPushData, $"{unpushedCommitsCount} unpushed data commit(s). Click to push to GitHub.");
                    }
                    else
                    {
                        btnPushData.Text = "💾 Push Data";
                        btnPushData.ForeColor = Color.FromArgb(148, 163, 184);
                        btnPushData.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
                        btnPushData.BackColor = Color.FromArgb(30, 41, 59);
                        toolTip.SetToolTip(btnPushData, "All game data is synced with GitHub origin.");
                    }

                    if (!string.IsNullOrEmpty(bootCommit) && !string.IsNullOrEmpty(latestCommit) && bootCommit != latestCommit)
                    {
                        btnSyncNewCode.Text = "🚀 Sync New Code (Available!)";
                        btnSyncNewCode.ForeColor = Color.FromArgb(56, 189, 248);
                        btnSyncNewCode.FlatAppearance.BorderColor = Color.FromArgb(56, 189, 248);
                        btnSyncNewCode.BackColor = Color.FromArgb(15, 30, 50);
                        toolTip.SetToolTip(btnSyncNewCode, $"Antigravity pushed code {latestCommit} (you are on {bootCommit}). Click to compile & test.");
                    }
                    else
                    {
                        btnSyncNewCode.Text = "🚀 Sync New Code";
                        btnSyncNewCode.ForeColor = Color.FromArgb(56, 189, 248);
                        btnSyncNewCode.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
                        btnSyncNewCode.BackColor = Color.FromArgb(30, 41, 59);
                        toolTip.SetToolTip(btnSyncNewCode, "Rebuilds client & server bundles with latest code from disk and reloads both.");
                    }
                });
            }
        }
        catch { }
    }

    private async Task HandlePushDataClickAsync()
    {
        if (!string.IsNullOrEmpty(bootCommit) && !string.IsNullOrEmpty(latestCommit) && bootCommit != latestCommit)
        {
            var choice = MessageBox.Show(
                $"⚠️ Code Updated by Antigravity!\n\n" +
                $"Antigravity committed/pushed new code ({latestCommit}) since you launched this session ({bootCommit}).\n" +
                $"Your data tweaks were made against code {bootCommit}.\n\n" +
                $"• Click YES to Sync New Code first (recommended so you can verify how your tweaks feel).\n" +
                $"• Click NO to Push Data directly to GitHub right now without testing.\n" +
                $"• Click CANCEL to abort.",
                "Confirm Data Push (Code Version Mismatch)",
                MessageBoxButtons.YesNoCancel,
                MessageBoxIcon.Warning
            );

            if (choice == DialogResult.Yes)
            {
                await HandleSyncNewCodeClickAsync();
                return;
            }
            else if (choice == DialogResult.Cancel)
            {
                return;
            }
        }

        btnPushData.Enabled = false;
        btnPushData.Text = "⏳ Pushing Data...";
        try
        {
            var resp = await devClient.PostAsync($"http://127.0.0.1:{currentPort}/api/dev/git-push-data", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
            var content = await resp.Content.ReadAsStringAsync();
            if (resp.IsSuccessStatusCode)
            {
                statusLabel.Text = "✅ Data pushed to GitHub!";
                statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
                MessageBox.Show("✅ Game data successfully committed and pushed to GitHub!", "Data Push Successful", MessageBoxButtons.OK, MessageBoxIcon.Information);
                await CheckGitStatusAsync();
            }
            else
            {
                MessageBox.Show($"Failed to push data:\n{content}", "Push Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error pushing data: {ex.Message}", "Network/Git Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnPushData.Enabled = true;
        }
    }

    private void HandleRefreshClientClick()
    {
        btnRefreshClient.Text = "⏳ Refreshing...";
        statusLabel.Text = "🟡 Refreshing client...";
        statusLabel.ForeColor = Color.FromArgb(253, 224, 71);
        try
        {
            webView?.Reload();
        }
        catch { }
        finally
        {
            btnRefreshClient.Text = "🔄 Refresh Client";
            statusLabel.Text = $"🟢 Online (Port {currentPort})";
            statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
        }
    }

    private async Task HandleResetMatchClickAsync()
    {
        btnResetMatch.Enabled = false;
        btnResetMatch.Text = "⏳ Resetting...";
        statusLabel.Text = "🟡 Resetting arena & room simulation...";
        statusLabel.ForeColor = Color.FromArgb(253, 224, 71);

        try
        {
            // Reset server physics simulation so room returns to pristine spawn state
            await devClient.PostAsync($"http://127.0.0.1:{currentPort}/api/dev/restart-server", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        }
        catch { }
        finally
        {
            webView?.Reload();
            statusLabel.Text = $"🟢 Online (Port {currentPort})";
            statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
            btnResetMatch.Enabled = true;
            btnResetMatch.Text = "⚡ Reset Match";
        }
    }

    private async Task HandleSyncNewCodeClickAsync()
    {
        btnSyncNewCode.Enabled = false;
        btnSyncNewCode.Text = "⏳ Syncing...";
        statusLabel.Text = "🟡 Checking for code changes...";
        statusLabel.ForeColor = Color.FromArgb(253, 224, 71);

        try
        {
            var resp = await devClient.PostAsync($"http://127.0.0.1:{currentPort}/api/dev/sync-rebuild", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
            var content = await resp.Content.ReadAsStringAsync();

            if (resp.IsSuccessStatusCode)
            {
                bool isRebuild = !content.Contains("already up to date");
                statusLabel.Text = isRebuild ? "✅ Code snapshot rebuilt! Reloading..." : "⚡ Code is up to date! Refreshing...";
                statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
                await CheckGitStatusAsync();
                bootCommit = latestCommit; // update baseline
                btnSyncNewCode.Text = "🚀 Sync New Code";
                webView?.Reload();

                // Auto-reset status label after reload completes
                _ = Task.Run(async () =>
                {
                    await Task.Delay(1500);
                    if (this.IsHandleCreated && !this.IsDisposed)
                    {
                        this.BeginInvoke(() =>
                        {
                            statusLabel.Text = $"🟢 Online (Port {currentPort})";
                            statusLabel.ForeColor = Color.FromArgb(74, 222, 128);
                        });
                    }
                });
            }
            else
            {
                MessageBox.Show($"Cannot sync code:\n{content}", "Sync / Build Blocked", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                statusLabel.Text = "⚠️ Sync blocked (compilation error)";
                statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Sync error: {ex.Message}", "Sync Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnSyncNewCode.Enabled = true;
            btnSyncNewCode.Text = "🚀 Sync New Code";
        }
    }
}
