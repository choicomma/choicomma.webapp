using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using System.Net;
using System.Net.Sockets;
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

            Log("Application Starting (v2.0 Network Direct Edition)...");

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

                Log("Acquired mutex. Starting Application.Run with MainForm...");
                Application.Run(new MainForm());
                Log("Application.Run exited.");
            }
        }
    }

    public class MainForm : Form
    {
        private NotifyIcon _trayIcon;
        private TcpListener _tcpListener;
        private Thread _listenerThread;
        private bool _isRunning = true;
        private const int Port = 18080;

        public MainForm()
        {
            this.WindowState = FormWindowState.Minimized;
            this.ShowInTaskbar = false;
            this.FormBorderStyle = FormBorderStyle.None;
            this.Size = new Size(0, 0);

            InitializeTray();
            StartServer();
        }

        protected override void SetVisibleCore(bool value)
        {
            if (!IsHandleCreated)
            {
                CreateHandle();
            }
            base.SetVisibleCore(false);
        }

        public static List<string> GetLocalIPv4Addresses()
        {
            List<string> ips = new List<string>();
            try
            {
                string hostName = Dns.GetHostName();
                IPAddress[] addresses = Dns.GetHostAddresses(hostName);
                foreach (IPAddress addr in addresses)
                {
                    if (addr.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(addr))
                    {
                        ips.Add(addr.ToString());
                    }
                }
            }
            catch (Exception ex)
            {
                Program.Log("GetLocalIPv4Addresses error: " + ex.Message);
            }
            return ips;
        }

        private void InitializeTray()
        {
            ContextMenu contextMenu = new ContextMenu();

            MenuItem titleItem = new MenuItem("초이콤마 네트워크 다이렉트 프린트 브릿지 (작동 중)");
            titleItem.Enabled = false;
            contextMenu.MenuItems.Add(titleItem);

            contextMenu.MenuItems.Add(new MenuItem("-"));

            MenuItem ipItem = new MenuItem("내 컴퓨터 IP 주소 확인 (원격 출력용)", OnShowIp);
            ipItem.DefaultItem = true;
            contextMenu.MenuItems.Add(ipItem);

            MenuItem statusItem = new MenuItem("프린터 연결 상태 확인", OnCheckStatus);
            contextMenu.MenuItems.Add(statusItem);

            contextMenu.MenuItems.Add(new MenuItem("-"));

            MenuItem exitItem = new MenuItem("프로그램 종료", OnExit);
            contextMenu.MenuItems.Add(exitItem);

            _trayIcon = new NotifyIcon
            {
                Icon = CreateBridgeIcon(),
                ContextMenu = contextMenu,
                Visible = true,
                Text = "초이콤마 프린트 브릿지 (포트 18080 대기 중)"
            };

            _trayIcon.DoubleClick += (s, e) => OnShowIp(s, e);

            List<string> localIps = GetLocalIPv4Addresses();
            string ipDisplay = localIps.Count > 0 ? localIps[0] : "127.0.0.1";
            _trayIcon.ShowBalloonTip(
                3000,
                "초이콤마 프린트 브릿지 실행됨",
                string.Format("프린터 대기 중 (IP: {0}:18080)\n노트북이나 다른 PC에서도 네트워크로 즉시 인쇄 가능합니다.", ipDisplay),
                ToolTipIcon.Info
            );
        }

        private void OnShowIp(object sender, EventArgs e)
        {
            List<string> localIps = GetLocalIPv4Addresses();
            string primaryIp = localIps.Count > 0 ? localIps[0] : "127.0.0.1";

            try
            {
                Clipboard.SetText(primaryIp);
            }
            catch { }

            string msg = string.Format(
                "이 컴퓨터(프린터 연결 PC)의 IP 주소:\n👉  {0}  (클립보드에 자동 복사됨)\n\n" +
                "사용 방법:\n" +
                "1. 다른 컴퓨터나 노트북에서 초이콤마 관리자 페이지를 엽니다.\n" +
                "2. 송장 인쇄 화면에서 [프린터 PC 설정]을 누릅니다.\n" +
                "3. 위 IP 주소({0})를 붙여넣고 [저장]하시면\n" +
                "   어디서든 [즉시 인쇄] 버튼 하나로 이 컴퓨터의 라벨 프린터에서 바로 출력됩니다!",
                primaryIp
            );

            MessageBox.Show(
                msg,
                "초이콤마 네트워크 프린트 브릿지 - IP 확인",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private Icon CreateBridgeIcon()
        {
            using (Bitmap bmp = new Bitmap(16, 16))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = SmoothingMode.AntiAlias;

                using (SolidBrush bodyBrush = new SolidBrush(Color.FromArgb(30, 41, 59)))
                {
                    g.FillRectangle(bodyBrush, 2, 5, 12, 7);
                }

                using (SolidBrush paperBrush = new SolidBrush(Color.FromArgb(240, 240, 240)))
                {
                    g.FillRectangle(paperBrush, 4, 1, 8, 4);
                    g.FillRectangle(paperBrush, 4, 10, 8, 5);
                }

                using (SolidBrush ledBrush = new SolidBrush(Color.FromArgb(16, 185, 129)))
                {
                    g.FillRectangle(ledBrush, 11, 7, 2, 2);
                }

                IntPtr hIcon = bmp.GetHicon();
                return Icon.FromHandle(hIcon);
            }
        }

        private void StartServer()
        {
            try
            {
                _tcpListener = new TcpListener(IPAddress.Any, Port);
                _tcpListener.Start();
                Program.Log(string.Format("TcpListener started on 0.0.0.0:{0}", Port));

                _listenerThread = new Thread(ListenLoop)
                {
                    IsBackground = true
                };
                _listenerThread.Start();
            }
            catch (Exception ex)
            {
                Program.Log("StartServer failed: " + ex.Message);
                MessageBox.Show(
                    "네트워크 수신 서버 시작 실패: " + ex.Message + "\n다른 프로그램이 포트 " + Port + "를 사용 중인지 확인해주세요.",
                    "초이콤마 프린트 브릿지 오류",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            Program.Log("OnFormClosing called: " + e.CloseReason);
            base.OnFormClosing(e);
        }

        private void ListenLoop()
        {
            Program.Log("ListenLoop entering while loop...");
            while (_isRunning && _tcpListener != null)
            {
                try
                {
                    TcpClient client = _tcpListener.AcceptTcpClient();
                    Program.Log("TcpClient accepted from: " + client.Client.RemoteEndPoint);
                    ThreadPool.QueueUserWorkItem(ProcessClient, client);
                }
                catch (Exception ex)
                {
                    Program.Log("ListenLoop Exception: " + ex.Message);
                    if (!_isRunning) break;
                }
            }
            Program.Log("ListenLoop exited. _isRunning=" + _isRunning);
        }

        private void ProcessClient(object state)
        {
            TcpClient client = (TcpClient)state;
            try
            {
                using (NetworkStream ns = client.GetStream())
                {
                    ns.ReadTimeout = 30000;
                    ns.WriteTimeout = 30000;

                    // 1. HTTP 헤더 읽기
                    MemoryStream msHeader = new MemoryStream();
                    byte[] singleByte = new byte[1];
                    byte prevByte = 0;
                    while (ns.Read(singleByte, 0, 1) > 0)
                    {
                        msHeader.WriteByte(singleByte[0]);
                        if ((prevByte == '\r' && singleByte[0] == '\n') || singleByte[0] == '\n')
                        {
                            byte[] curBytes = msHeader.ToArray();
                            int len = curBytes.Length;
                            if (len >= 4 && curBytes[len - 4] == '\r' && curBytes[len - 3] == '\n' && curBytes[len - 2] == '\r' && curBytes[len - 1] == '\n')
                            {
                                break;
                            }
                            if (len >= 2 && curBytes[len - 2] == '\n' && curBytes[len - 1] == '\n')
                            {
                                break;
                            }
                        }
                        prevByte = singleByte[0];
                    }

                    string headerString = Encoding.UTF8.GetString(msHeader.ToArray());
                    if (string.IsNullOrEmpty(headerString))
                    {
                        client.Close();
                        return;
                    }

                    string[] headerLines = headerString.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    string reqLine = headerLines.Length > 0 ? headerLines[0] : "";
                    string[] reqParts = reqLine.Split(' ');
                    string method = reqParts.Length > 0 ? reqParts[0].ToUpper() : "GET";
                    string rawUrl = reqParts.Length > 1 ? reqParts[1].ToLower() : "/";

                    // 2. CORS Preflight 처리
                    if (method == "OPTIONS")
                    {
                        SendHttpRaw(ns, 204, "No Content", "text/plain", new byte[0]);
                        client.Close();
                        return;
                    }

                    // 3. Content-Length 파싱
                    int contentLength = 0;
                    foreach (string line in headerLines)
                    {
                        if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        {
                            int.TryParse(line.Substring("Content-Length:".Length).Trim(), out contentLength);
                        }
                    }

                    // 4. 요청 본문 읽기
                    byte[] bodyBytes = new byte[contentLength];
                    if (contentLength > 0)
                    {
                        int totalRead = 0;
                        while (totalRead < contentLength)
                        {
                            int read = ns.Read(bodyBytes, totalRead, contentLength - totalRead);
                            if (read <= 0) break;
                            totalRead += read;
                        }
                    }

                    // 5. 라우팅
                    if (method == "GET" && (rawUrl == "/" || rawUrl.StartsWith("/health") || rawUrl.StartsWith("/status")))
                    {
                        HandleHealthCheck(ns);
                    }
                    else if (method == "POST" && rawUrl.StartsWith("/print"))
                    {
                        string bodyString = Encoding.UTF8.GetString(bodyBytes);
                        HandlePrint(ns, bodyString);
                    }
                    else
                    {
                        SendJsonResponse(ns, 404, "Not Found", new { error = "Not Found" });
                    }
                }
            }
            catch (Exception ex)
            {
                Program.Log("Client processing error: " + ex.Message);
            }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private void SendHttpRaw(NetworkStream ns, int statusCode, string statusText, string contentType, byte[] bodyBytes)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(string.Format("HTTP/1.1 {0} {1}\r\n", statusCode, statusText));
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
            sb.Append("Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With\r\n");
            sb.Append("Access-Control-Allow-Private-Network: true\r\n");
            sb.Append("Connection: close\r\n");
            sb.Append(string.Format("Content-Type: {0}\r\n", contentType));
            sb.Append(string.Format("Content-Length: {0}\r\n", bodyBytes.Length));
            sb.Append("\r\n");

            byte[] headBytes = Encoding.UTF8.GetBytes(sb.ToString());
            ns.Write(headBytes, 0, headBytes.Length);
            if (bodyBytes.Length > 0)
            {
                ns.Write(bodyBytes, 0, bodyBytes.Length);
            }
            ns.Flush();
        }

        private void SendJsonResponse(NetworkStream ns, int statusCode, string statusText, object data)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            string json = serializer.Serialize(data);
            byte[] bodyBytes = Encoding.UTF8.GetBytes(json);
            SendHttpRaw(ns, statusCode, statusText, "application/json; charset=utf-8", bodyBytes);
        }

        private void HandleHealthCheck(NetworkStream ns)
        {
            string xprinter = FindXprinterName();
            List<string> printers = new List<string>();
            foreach (string p in PrinterSettings.InstalledPrinters)
            {
                printers.Add(p);
            }

            List<string> localIps = GetLocalIPv4Addresses();

            SendJsonResponse(ns, 200, "OK", new
            {
                status = "ok",
                bridge = "ChoicommaPrintBridge",
                version = "2.0.0",
                found = (xprinter != null),
                xprinterDetected = (xprinter != null),
                xprinterName = xprinter,
                printer = xprinter,
                machineName = Environment.MachineName,
                localIps = localIps,
                port = Port,
                allPrinters = printers
            });
        }

        private void HandlePrint(NetworkStream ns, string requestBody)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer
            {
                MaxJsonLength = 100 * 1024 * 1024 // 100MB 지원
            };

            Dictionary<string, object> payload = serializer.Deserialize<Dictionary<string, object>>(requestBody);
            if (payload == null || !payload.ContainsKey("images"))
            {
                SendJsonResponse(ns, 400, "Bad Request", new { error = "images 필드가 필요합니다." });
                return;
            }

            System.Collections.IEnumerable imageList = payload["images"] as System.Collections.IEnumerable;
            if (imageList == null)
            {
                SendJsonResponse(ns, 400, "Bad Request", new { error = "images 필드가 유효하지 않습니다." });
                return;
            }

            string targetPrinter = null;
            if (payload.ContainsKey("printerName") && payload["printerName"] != null)
            {
                targetPrinter = payload["printerName"].ToString();
            }

            if (string.IsNullOrEmpty(targetPrinter) || !IsPrinterInstalled(targetPrinter))
            {
                targetPrinter = FindXprinterName();
            }

            if (string.IsNullOrEmpty(targetPrinter))
            {
                SendJsonResponse(ns, 400, "Bad Request", new { error = "Xprinter 라벨 프린터를 찾을 수 없습니다." });
                return;
            }

            int rotation = 90;
            if (payload.ContainsKey("rotation") && payload["rotation"] != null)
            {
                int.TryParse(payload["rotation"].ToString(), out rotation);
            }

            float offsetX = 0f;
            if (payload.ContainsKey("offsetX") && payload["offsetX"] != null)
            {
                float.TryParse(payload["offsetX"].ToString(), out offsetX);
            }

            float offsetY = 0f;
            if (payload.ContainsKey("offsetY") && payload["offsetY"] != null)
            {
                float.TryParse(payload["offsetY"].ToString(), out offsetY);
            }

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
                    SendJsonResponse(ns, 400, "Bad Request", new { error = "유효한 인쇄 이미지가 없습니다." });
                    return;
                }

                PrintBitmapsToPrinter(bitmaps, targetPrinter, rotation, offsetX, offsetY);

                SendJsonResponse(ns, 200, "OK", new
                {
                    success = true,
                    message = "인쇄 작업이 정상적으로 전송되었습니다.",
                    targetPrinter = targetPrinter,
                    count = bitmaps.Count,
                    rotation = rotation,
                    offsetX = offsetX,
                    offsetY = offsetY
                });
            }
            catch (Exception ex)
            {
                Program.Log("HandlePrint Exception: " + ex.Message);
                SendJsonResponse(ns, 500, "Internal Server Error", new { error = ex.Message });
            }
            finally
            {
                foreach (Bitmap b in bitmaps)
                {
                    b.Dispose();
                }
            }
        }

        private void PrintBitmapsToPrinter(List<Bitmap> bitmaps, string printerName, int rotation, float offsetX, float offsetY)
        {
            int pageIndex = 0;

            using (PrintDocument doc = new PrintDocument())
            {
                doc.PrinterSettings.PrinterName = printerName;
                doc.DocumentName = "CJ대한통운 송장 (" + bitmaps.Count + "건)";

                // 123mm x 100mm (0.01인치 단위: 123mm=484, 100mm=394)
                PaperSize labelSize;
                if (rotation == 90 || rotation == 270)
                {
                    labelSize = new PaperSize("CJ_100x123", 394, 484);
                }
                else
                {
                    labelSize = new PaperSize("CJ_123x100", 484, 394);
                }
                doc.DefaultPageSettings.PaperSize = labelSize;
                doc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
                doc.DefaultPageSettings.Landscape = false;

                doc.PrintController = new StandardPrintController();

                doc.PrintPage += (sender, e) =>
                {
                    if (pageIndex < bitmaps.Count)
                    {
                        Bitmap bmp = bitmaps[pageIndex];

                        if (rotation == 90)
                        {
                            bmp.RotateFlip(RotateFlipType.Rotate90FlipNone);
                        }
                        else if (rotation == 180)
                        {
                            bmp.RotateFlip(RotateFlipType.Rotate180FlipNone);
                        }
                        else if (rotation == 270)
                        {
                            bmp.RotateFlip(RotateFlipType.Rotate270FlipNone);
                        }

                        e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        e.Graphics.SmoothingMode = SmoothingMode.HighQuality;

                        // 1mm = 3.937 단위 (0.01 inch)
                        float offX = offsetX * 3.937f;
                        float offY = offsetY * 3.937f;

                        e.Graphics.DrawImage(bmp, offX, offY, e.PageBounds.Width, e.PageBounds.Height);

                        pageIndex++;
                        e.HasMorePages = (pageIndex < bitmaps.Count);
                    }
                    else
                    {
                        e.HasMorePages = false;
                    }
                };

                doc.Print();
                Program.Log(string.Format("Printed {0} label(s) to '{1}' (rot={2}, offX={3:F1}mm, offY={4:F1}mm) successfully.", bitmaps.Count, printerName, rotation, offsetX, offsetY));
            }
        }

        private string FindXprinterName()
        {
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (printer.IndexOf("XP-DT108B", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return printer;
                }
            }

            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (printer.IndexOf("Xprinter", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return printer;
                }
            }

            return null;
        }

        private bool IsPrinterInstalled(string printerName)
        {
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (string.Equals(printer, printerName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private void OnCheckStatus(object sender, EventArgs e)
        {
            string xprinter = FindXprinterName();
            List<string> localIps = GetLocalIPv4Addresses();
            string ipListStr = localIps.Count > 0 ? string.Join(", ", localIps.ToArray()) : "127.0.0.1";

            if (xprinter != null)
            {
                MessageBox.Show(
                    string.Format(
                        "라벨 프린터가 정상 감지되었습니다!\n\n" +
                        "• 프린터: {0}\n" +
                        "• 네트워크 수신 대기: 포트 {1}\n" +
                        "• 이 컴퓨터의 IP: {2}\n\n" +
                        "다른 PC(노트북)에서 위 IP를 설정하시면 무선으로 즉시 인쇄됩니다.",
                        xprinter, Port, ipListStr
                    ),
                    "초이콤마 프린트 브릿지 상태",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            else
            {
                MessageBox.Show(
                    string.Format(
                        "Xprinter 라벨 프린터가 감지되지 않았습니다.\n\n" +
                        "1. 프린터 전원이 켜져 있는지 확인해주세요.\n" +
                        "2. USB 케이블이 이 컴퓨터에 연결되어 있는지 확인해주세요.\n" +
                        "3. 윈도우 '프린터 및 스캐너'에 XP-DT108B 드라이버가 등록되어 있는지 확인해주세요.",
                        Port
                    ),
                    "초이콤마 프린트 브릿지 상태",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
        }

        private void OnExit(object sender, EventArgs e)
        {
            _isRunning = false;

            if (_tcpListener != null)
            {
                try { _tcpListener.Stop(); } catch { }
            }

            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
            }

            Application.Exit();
        }
    }
}
