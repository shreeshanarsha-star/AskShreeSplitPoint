import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), "chrome-extension");

    if (!fs.existsSync(extensionDir)) {
      return NextResponse.json({ error: "Extension files not found" }, { status: 404 });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const passthrough = new PassThrough();

    archive.pipe(passthrough);
    archive.directory(extensionDir, false);
    archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of passthrough) {
      chunks.push(Buffer.from(chunk));
    }
    const zipBuffer = Buffer.concat(chunks);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="askshree-sourcing-copilot.zip"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate extension zip" },
      { status: 500 }
    );
  }
}
