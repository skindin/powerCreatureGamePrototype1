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
    private Button btnToggleTunnel = null!;
    private Button btnCopyLink = null!;
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

        // Public Tunnel Toggle Button
        btnToggleTunnel = CreateHeaderButton("🌐 Public: OFF", async (s, e) => await ToggleTunnelAsync());
        btnToggleTunnel.ForeColor = Color.FromArgb(148, 163, 184);
        toolTip.SetToolTip(btnToggleTunnel, "Click to create a secure public tunnel URL for other devices/networks");

        // Copy Link Button (initially hidden until public tunnel is active)
        btnCopyLink = CreateHeaderButton("📋 Copy Link", async (s, e) => await CopyLinkAsync());
        btnCopyLink.ForeColor = Color.FromArgb(56, 189, 248);
        btnCopyLink.Visible = false;

        btnReload = CreateHeaderButton("🔄 Reload", (s, e) => webView?.Reload());
        btnFullscreen = CreateHeaderButton("⛶ Fullscreen", (s, e) => ToggleFullscreen());
        btnDevTools = CreateHeaderButton("🛠 DevTools", (s, e) => webView?.CoreWebView2?.OpenDevToolsWindow());
        btnBrowser = CreateHeaderButton("🌐 Browser", (s, e) => OpenInBrowser());

        toolTip.SetToolTip(btnReload, "Reload the game (F5)");
        toolTip.SetToolTip(btnFullscreen, "Toggle fullscreen (F11)");
        toolTip.SetToolTip(btnDevTools, "Open DevTools inspect window (F12)");
        toolTip.SetToolTip(btnBrowser, "Open in your default web browser");

        buttonFlow.Controls.Add(btnToggleTunnel);
        buttonFlow.Controls.Add(btnCopyLink);
        buttonFlow.Controls.Add(btnReload);
        buttonFlow.Controls.Add(btnFullscreen);
        buttonFlow.Controls.Add(btnDevTools);
        buttonFlow.Controls.Add(btnBrowser);
        topBar.Controls.Add(buttonFlow);

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

        // WebView2 Control
        webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(11, 15, 25),
            Visible = false
        };
        this.Controls.Add(webView);
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

        // 2. Initialize WebView2
        try
        {
            await webView.EnsureCoreWebView2Async();
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;

            webView.NavigationCompleted += (s, e) =>
            {
                loadingPanel.Visible = false;
                webView.Visible = true;
                webView.Focus();
            };

            webView.CoreWebView2.Navigate(activeUrl);
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
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c npx -y localtunnel --port {currentPort}",
                WorkingDirectory = projectDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

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
                publicTunnelUrl = await tcsUrl.Task;
                btnToggleTunnel.Text = "🌐 Public: ON";
                btnToggleTunnel.ForeColor = Color.FromArgb(74, 222, 128);
                btnToggleTunnel.BackColor = Color.FromArgb(20, 83, 45);
                btnToggleTunnel.FlatAppearance.BorderColor = Color.FromArgb(34, 197, 94);
                btnToggleTunnel.Enabled = true;

                btnCopyLink.Visible = true;
                toolTip.SetToolTip(btnToggleTunnel, $"Public link: {publicTunnelUrl}\nClick to turn OFF");
                toolTip.SetToolTip(btnCopyLink, $"Copy public link:\n{publicTunnelUrl}");

                statusLabel.Text = $"🟢 Online ({currentPort}) | 🌐 Public Active";
            }
            else
            {
                StopTunnel();
                MessageBox.Show("Could not obtain public tunnel URL within 15 seconds. Please verify your internet connection and try again.", "Public Tunnel", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
        catch (Exception ex)
        {
            StopTunnel();
            MessageBox.Show($"Failed to launch tunnel:\n{ex.Message}", "Public Tunnel", MessageBoxButtons.OK, MessageBoxIcon.Error);
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

        publicTunnelUrl = null;
        btnToggleTunnel.Text = "🌐 Public: OFF";
        btnToggleTunnel.ForeColor = Color.FromArgb(148, 163, 184);
        btnToggleTunnel.BackColor = Color.FromArgb(30, 41, 59);
        btnToggleTunnel.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
        btnToggleTunnel.Enabled = true;

        btnCopyLink.Visible = false;
        toolTip.SetToolTip(btnToggleTunnel, "Click to create a secure public tunnel URL for other devices/networks");
        statusLabel.Text = $"🟢 Online (Port {currentPort})";
    }

    private async Task CopyLinkAsync()
    {
        if (string.IsNullOrEmpty(publicTunnelUrl)) return;

        try
        {
            Clipboard.SetText(publicTunnelUrl);
            btnCopyLink.Text = "✅ Copied!";
            btnCopyLink.ForeColor = Color.FromArgb(74, 222, 128);
            await Task.Delay(1500);
            btnCopyLink.Text = "📋 Copy Link";
            btnCopyLink.ForeColor = Color.FromArgb(56, 189, 248);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to copy to clipboard: {ex.Message}", "Clipboard Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
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
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npm run dev",
                WorkingDirectory = projectDir,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false
            };
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
    }
}
