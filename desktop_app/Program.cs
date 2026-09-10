using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace desktop_app;

static class Program
{
    [DllImport("shell32.dll", SetLastError = true)]
    private static extern void SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

    [STAThread]
    static void Main()
    {
        // Explicit AppUserModelID ensures Windows pins this specific app and icon to the Taskbar
        try
        {
            SetCurrentProcessExplicitAppUserModelID("PowerCreatureGame.Prototype1");
        }
        catch { }

        ApplicationConfiguration.Initialize();
        Application.Run(new Form1());
    }    
}