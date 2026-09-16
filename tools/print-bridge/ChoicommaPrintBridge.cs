using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace ChoicommaPrintBridge
{
    static class Program
    {
        private const string MutexName = "ChoicommaPrintBridge_SingleInstance_Mutex";
        public static readonly string LogPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge.log");

        public static void Log(string msg)
        {
            try
            {
                File.AppendAllText(LogPath, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}\r\n", DateTime.Now, msg));
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                Log("FATAL UnhandledException: " + (e.ExceptionObject != null ? e.ExceptionObject.ToString() : "null"));
            };

            Application.ThreadException += (s, e) =>
            {
                Log("FATAL ThreadException: " + (e.Exception != null ? e.Exception.ToString() : "null"));
            };

            Log("Application Starting...");

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            using (Mutex mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    Log("Already running instance detected. Exiting.");
                    MessageBox.Show(
                        "초이콤마 프린트 브릿지가 이미 실행 중입니다.\n윈도우 시계 옆 작업 표시줄(트레이)을 확인해주세요.",
                        "초이콤마 프린트 브릿지",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                    return;
                }

                Log("Acquired mutex. Starting Application.Run...");
                Application.Run(new BridgeApplicationContext());
                Log("Application.Run exited.");
            }
        }
    }

    public class BridgeApplicationContext : ApplicationContext
    {
        private NotifyIcon _trayIcon;
        private HttpListener _listener;
        private Thread _listenerThread;
        private bool _isRunning = true;
        private const int Port = 18080;

        public BridgeApplicationContext()
        {
            InitializeTray();
            StartHttpServer();
        }

        private void InitializeTray()
        {
            ContextMenu contextMenu = new ContextMenu();

            MenuItem titleItem = new MenuItem("초이콤마 다이렉트 프린트 브릿지 (작동 중)");
            titleItem.Enabled = false;
            contextMenu.MenuItems.Add(titleItem);

            contextMenu.MenuItems.Add(new MenuItem("-"));

            MenuItem statusItem = new MenuItem("프린터 연결 상태 확인", OnCheckStatus);
            contextMenu.MenuItems.Add(statusItem);

            contextMenu.MenuItems.Add(new MenuItem("-"));

            MenuItem exitItem = new MenuItem("프로그램 종료", OnExit);
            contextMenu.MenuItems.Add(exitItem);

            _trayIcon = new NotifyIcon
            {
                Icon = CreatePrinterIcon(),
                ContextMenu = contextMenu,
                Text = "초이콤마 프린트 브릿지 (포트 18080)",
                Visible = true
            };
        }

        private Icon CreatePrinterIcon()
        {
            // 동적으로 16x16 프린터 모양 아이콘 생성 (외부 .ico 파일 불필요)
            using (Bitmap bmp = new Bitmap(16, 16))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = SmoothingMode.AntiAlias;

                // 본체 (다크 그레이)
                using (SolidBrush bodyBrush = new SolidBrush(Color.FromArgb(40, 44, 52)))
                {
                    g.FillRectangle(bodyBrush, 2, 5, 12, 7);
                }

                // 용지 투입부 (화이트)
                using (SolidBrush paperBrush = new SolidBrush(Color.FromArgb(240, 240, 240)))
                {
                    g.FillRectangle(paperBrush, 4, 1, 8, 4);
                    // 인쇄 배출 용지
                    g.FillRectangle(paperBrush, 4, 10, 8, 5);
                }

                // 포인트 LED (블루)
                using (SolidBrush ledBrush = new SolidBrush(Color.FromArgb(37, 99, 235)))
                {
                    g.FillRectangle(ledBrush, 11, 7, 2, 2);
                }

                IntPtr hIcon = bmp.GetHicon();
                return Icon.FromHandle(hIcon);
            }
        }

        private void StartHttpServer()
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://localhost:" + Port + "/");
                _listener.Start();

                _listenerThread = new Thread(ListenLoop)
                {
                    IsBackground = true
                };
                _listenerThread.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "HTTP 리스너 시작 실패: " + ex.Message + "\n다른 프로그램이 포트 " + Port + "를 사용 중인지 확인해주세요.",
                    "초이콤마 프린트 브릿지 오류",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void ListenLoop()
        {
            while (_isRunning && _listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext ctx = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, ctx);
                }
                catch
                {
                    if (!_isRunning) break;
                }
            }
        }

        private void ProcessRequest(object state)
        {
            HttpListenerContext ctx = (HttpListenerContext)state;
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;

            // CORS 헤더 설정
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Accept");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 200;
                res.Close();
                return;
            }

            try
            {
                string rawUrl = req.RawUrl != null ? req.RawUrl.ToLower() : "";

                if (req.HttpMethod == "GET" && (rawUrl == "/" || rawUrl.StartsWith("/health") || rawUrl.StartsWith("/status")))
                {
                    HandleHealthCheck(res);
                }
                else if (req.HttpMethod == "POST" && rawUrl.StartsWith("/print"))
                {
                    HandlePrint(req, res);
                }
                else
                {
                    SendJsonResponse(res, 404, new { error = "Not Found" });
                }
            }
            catch (Exception ex)
            {
                SendJsonResponse(res, 500, new { error = ex.Message });
            }
        }

        private void HandleHealthCheck(HttpListenerResponse res)
        {
            string xprinter = FindXprinterName();
            List<string> printers = new List<string>();
            foreach (string p in PrinterSettings.InstalledPrinters)
            {
                printers.Add(p);
            }

            SendJsonResponse(res, 200, new
            {
                status = "ok",
                bridge = "ChoicommaPrintBridge",
                version = "1.0.0",
                xprinterDetected = (xprinter != null),
                xprinterName = xprinter,
                allPrinters = printers
            });
        }

        private void HandlePrint(HttpListenerRequest req, HttpListenerResponse res)
        {
            string requestBody;
            using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
            {
                requestBody = reader.ReadToEnd();
            }

            JavaScriptSerializer serializer = new JavaScriptSerializer
            {
                MaxJsonLength = 100 * 1024 * 1024 // 100MB 지원 (다량의 라벨 이미지)
            };

            Dictionary<string, object> payload = serializer.Deserialize<Dictionary<string, object>>(requestBody);
            if (payload == null || !payload.ContainsKey("images"))
            {
                SendJsonResponse(res, 400, new { error = "images 필드가 필요합니다." });
                return;
            }

            System.Collections.IEnumerable imageList = payload["images"] as System.Collections.IEnumerable;
            if (imageList == null)
            {
                SendJsonResponse(res, 400, new { error = "images 필드가 필요합니다." });
                return;
            }

            string targetPrinter = null;
            if (payload.ContainsKey("printerName") && payload["printerName"] != null)
            {
                targetPrinter = payload["printerName"].ToString();
            }

            // 지정된 프린터가 없거나 존재하지 않으면 자동 감지된 Xprinter 사용
            if (string.IsNullOrEmpty(targetPrinter) || !IsPrinterInstalled(targetPrinter))
            {
                targetPrinter = FindXprinterName();
            }

            if (string.IsNullOrEmpty(targetPrinter))
            {
                SendJsonResponse(res, 400, new { error = "Xprinter 라벨 프린터를 찾을 수 없습니다. 드라이버 설치 상태를 확인해주세요." });
                return;
            }

            // Base64 이미지 디코딩
            List<Bitmap> bitmaps = new List<Bitmap>();
            try
            {
                foreach (object imgObj in imageList)
                {
                    if (imgObj == null) continue;
                    string dataUrl = imgObj.ToString();
                    int commaIdx = dataUrl.IndexOf(',');
                    string base64Str = commaIdx >= 0 ? dataUrl.Substring(commaIdx + 1) : dataUrl;
                    byte[] bytes = Convert.FromBase64String(base64Str);
                    using (MemoryStream ms = new MemoryStream(bytes))
                    {
                        bitmaps.Add(new Bitmap(ms));
                    }
                }

                if (bitmaps.Count == 0)
                {
                    SendJsonResponse(res, 400, new { error = "유효한 인쇄 이미지가 없습니다." });
                    return;
                }

                // 윈도우 GDI 인쇄 스풀러로 전송
                PrintBitmapsToPrinter(bitmaps, targetPrinter);

                SendJsonResponse(res, 200, new
                {
                    success = true,
                    message = "인쇄 작업이 정상적으로 전송되었습니다.",
                    targetPrinter = targetPrinter,
                    count = bitmaps.Count
                });
            }
            finally
            {
                foreach (Bitmap b in bitmaps)
                {
                    b.Dispose();
                }
            }
        }

        private void PrintBitmapsToPrinter(List<Bitmap> bitmaps, string printerName)
        {
            int pageIndex = 0;

            using (PrintDocument doc = new PrintDocument())
            {
                doc.PrinterSettings.PrinterName = printerName;
                doc.DocumentName = "CJ대한통운 송장 (" + bitmaps.Count + "건)";

                // 123mm x 100mm (0.01인치 단위: 1인치 = 25.4mm)
                // 123mm ≈ 4.84인치 = 484
                // 100mm ≈ 3.94인치 = 394
                PaperSize labelSize = new PaperSize("CJ_123x100", 484, 394);
                doc.DefaultPageSettings.PaperSize = labelSize;
                doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
                doc.DefaultPageSettings.Landscape = false;

                // 윈도우 인쇄 진행 다이얼로그 팝업 제거 (완전 무인쇄창)
                doc.PrintController = new StandardPrintController();

                doc.PrintPage += (sender, e) =>
                {
                    if (pageIndex < bitmaps.Count)
                    {
                        Bitmap bmp = bitmaps[pageIndex];
                        e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        e.Graphics.SmoothingMode = SmoothingMode.HighQuality;

                        // 전체 페이지 영역에 맞추어 출력
                        e.Graphics.DrawImage(bmp, 0, 0, e.PageBounds.Width, e.PageBounds.Height);

                        pageIndex++;
                        e.HasMorePages = (pageIndex < bitmaps.Count);
                    }
                    else
                    {
                        e.HasMorePages = false;
                    }
                };

                doc.Print();
            }
        }

        private string FindXprinterName()
        {
            foreach (string p in PrinterSettings.InstalledPrinters)
            {
                if (p.IndexOf("Xprinter", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    p.IndexOf("XP-DT", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    p.IndexOf("LABEL", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return p;
                }
            }
            return null;
        }

        private bool IsPrinterInstalled(string name)
        {
            foreach (string p in PrinterSettings.InstalledPrinters)
            {
                if (string.Equals(p, name, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private void SendJsonResponse(HttpListenerResponse res, int statusCode, object data)
        {
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                string json = serializer.Serialize(data);
                byte[] buffer = Encoding.UTF8.GetBytes(json);

                res.StatusCode = statusCode;
                res.ContentType = "application/json; charset=utf-8";
                res.ContentLength64 = buffer.Length;
                res.OutputStream.Write(buffer, 0, buffer.Length);
                res.OutputStream.Close();
            }
            catch
            {
                // 클라이언트 연결 종료 시 무시
            }
        }

        private void OnCheckStatus(object sender, EventArgs e)
        {
            string xprinter = FindXprinterName();
            if (xprinter != null)
            {
                MessageBox.Show(
                    "감지된 송장 프린터:\n[" + xprinter + "]\n\n상태: 정상 작동 준비 완료 (포트 18080)",
                    "프린터 연결 상태 확인",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            else
            {
                MessageBox.Show(
                    "Xprinter 라벨 프린터를 찾을 수 없습니다.\nUSB 케이블 연결 및 전원 상태를 확인해주세요.",
                    "프린터 연결 상태 확인",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
        }

        private void OnExit(object sender, EventArgs e)
        {
            _isRunning = false;
            if (_listener != null)
            {
                try { _listener.Stop(); } catch { }
                try { _listener.Close(); } catch { }
            }

            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
            }

            Application.Exit();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                OnExit(null, null);
            }
            base.Dispose(disposing);
        }
    }
}
