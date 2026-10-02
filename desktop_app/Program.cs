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

        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
        Application.ThreadException += (s, e) => {
            System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), e.Exception.ToString());
            MessageBox.Show(e.Exception.ToString(), "Application Error");
        };
        AppDomain.CurrentDomain.UnhandledException += (s, e) => {
            System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), e.ExceptionObject.ToString());
            MessageBox.Show(e.ExceptionObject.ToString(), "Unhandled Exception");
        };

        try
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new Form1());
        }
        catch (Exception ex)
        {
            System.IO.File.WriteAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), ex.ToString());
            MessageBox.Show(ex.ToString(), "Fatal Error");
        }
    }    
}