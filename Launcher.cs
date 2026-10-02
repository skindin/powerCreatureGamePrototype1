using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;

class Program
{
    static Process serverProcess = null;

    static void Main(string[] args)
    {
        Console.Title = "Power Creature Prototype 1 Launcher";
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("============================================================");
        Console.WriteLine("    POWER CREATURE GAME PROTOTYPE 1 - LAUNCHER");
        Console.WriteLine("============================================================");
        Console.ResetColor();

        string projectDir = AppDomain.CurrentDomain.BaseDirectory;
        Directory.SetCurrentDirectory(projectDir);

        int activePort = 5173;
        bool alreadyRunning = IsServerReady(out activePort);

        if (alreadyRunning)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[INFO] Server is already running at http://localhost:" + activePort + "/");
            Console.ResetColor();
        }
        else
        {
            Console.WriteLine("[INFO] Starting Vite development server...");
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";

            string nodeDir = @"C:\Program Files\nodejs";
            string npmCmd = "npm";
            if (File.Exists(Path.Combine(nodeDir, "npm.cmd")))
            {
                npmCmd = "\"" + Path.Combine(nodeDir, "npm.cmd") + "\"";
                string currentPath = psi.EnvironmentVariables["PATH"] ?? "";
                if (!currentPath.Contains(nodeDir))
                {
                    psi.EnvironmentVariables["PATH"] = nodeDir + ";" + currentPath;
                }
            }

            psi.Arguments = "/c " + npmCmd + " run dev";
            psi.WorkingDirectory = projectDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = false;

            try
            {
                serverProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Failed to start npm run dev: " + ex.Message);
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            Console.WriteLine("[INFO] Waiting for server to become ready...");
            int attempts = 0;
            while (!IsServerReady(out activePort) && attempts < 40)
            {
                Thread.Sleep(300);
                attempts++;
            }

            if (!IsServerReady(out activePort))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Server failed to respond on port 5173 after 12 seconds.");
                Console.WriteLine("Please check if another process is blocking the port or run 'npm run dev' manually.");
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }
        }

        string url = "http://localhost:" + activePort + "/";

        string appDll = Path.Combine(projectDir, "app", "PowerCreatureGame.dll");
        string appExe = Path.Combine(projectDir, "app", "PowerCreatureGame.exe");
        if (File.Exists(appDll))
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[INFO] Launching Desktop Window: " + appDll);
            Console.ResetColor();
            try
            {
                Process.Start(new ProcessStartInfo("dotnet", "\"" + appDll + "\"")
                {
                    WorkingDirectory = projectDir,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not launch desktop window: " + ex.Message);
                try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            }
        }
        else if (File.Exists(appExe))
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[INFO] Launching Desktop Window: " + appExe);
            Console.ResetColor();
            try
            {
                Process.Start(new ProcessStartInfo(appExe) { WorkingDirectory = Path.GetDirectoryName(appExe) });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not launch desktop window: " + ex.Message);
                try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            }
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[INFO] Opening " + url + " in your default browser...");
            Console.ResetColor();

            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[WARN] Could not automatically open browser: " + ex.Message);
                Console.WriteLine("Please navigate to: " + url);
            }
        }

        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("============================================================");
        Console.WriteLine("Game server is running at: " + url);
        Console.WriteLine("Keep this window open while playing.");
        Console.WriteLine("Press Ctrl+C or close this window to stop.");
        Console.WriteLine("============================================================");
        Console.ResetColor();

        AppDomain.CurrentDomain.ProcessExit += (s, e) => KillServer();
        Console.CancelKeyPress += (s, e) => { KillServer(); };

        if (serverProcess != null && !serverProcess.HasExited)
        {
            serverProcess.WaitForExit();
        }
        else
        {
            Console.WriteLine("\nServer is active in the background. Press Enter to exit launcher...");
            Console.ReadLine();
        }
    }

    static bool IsServerReady(out int detectedPort)
    {
        int[] candidatePorts = new int[] { 5173, 5174, 5175, 5176 };
        foreach (int p in candidatePorts)
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

    static bool TryConnect(int port)
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create("http://localhost:" + port + "/");
            req.Timeout = 350;
            req.Method = "HEAD";
            using (var resp = req.GetResponse())
            {
                return true;
            }
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

    static void KillServer()
    {
        if (serverProcess != null && !serverProcess.HasExited)
        {
            try
            {
                Process.Start(new ProcessStartInfo("taskkill", "/F /T /PID " + serverProcess.Id)
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }
            catch { }
        }
    }
}
