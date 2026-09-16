import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const psCmd = `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DriverName, PortName, Default | ConvertTo-Json -Compress"`;
    const { stdout } = await execAsync(psCmd);
    let parsed: any[] = [];
    try {
      const json = JSON.parse(stdout);
      parsed = Array.isArray(json) ? json : [json];
    } catch {
      parsed = [];
    }

    const printers = parsed.map((p) => ({
      name: p.Name,
      driverName: p.DriverName,
      portName: p.PortName,
      isDefault: Boolean(p.Default),
      isXprinter: Boolean(p.Name && (p.Name.includes("Xprinter") || p.Name.includes("DT108"))),
    }));

    const xprinter = printers.find((p) => p.isXprinter);
    const defaultPrinter = printers.find((p) => p.isDefault);

    return NextResponse.json({
      success: true,
      printers,
      defaultPrinter: defaultPrinter?.name || null,
      isXprinterDefault: Boolean(xprinter?.isDefault),
      xprinterDetected: Boolean(xprinter),
      xprinterName: xprinter?.name || "Xprinter XP-DT108B LABEL",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "프린터 목록 조회 실패",
        xprinterDetected: true,
        xprinterName: "Xprinter XP-DT108B LABEL",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetPrinter = body.printerName || "Xprinter XP-DT108B LABEL";

    const psCmd = `powershell -NoProfile -Command "$p = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Name -like '*${targetPrinter.replace(/'/g, "")}*' } | Select-Object -First 1; if ($p) { Invoke-CimMethod -InputObject $p -MethodName SetDefaultPrinter | Out-Null; 'OK' } else { 'NOT_FOUND' }"`;
    const { stdout } = await execAsync(psCmd);

    if (stdout.includes("OK")) {
      return NextResponse.json({
        success: true,
        message: `${targetPrinter} 프린터를 기본 라벨 프린터로 설정했습니다.`,
        defaultPrinter: targetPrinter,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `${targetPrinter} 프린터를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "프린터 설정 실패",
      },
      { status: 500 }
    );
  }
}
