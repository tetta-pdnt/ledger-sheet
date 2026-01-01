import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Base data directory (project root/data)
const DATA_DIR = path.join(process.cwd(), 'data');

// GET /api/data?path=filename.yaml
// GET /api/data?path=transactions&list=true
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path') || '';
    const list = searchParams.get('list') === 'true';

    const fullPath = path.join(DATA_DIR, filePath);

    // Security check: ensure path is within DATA_DIR
    if (!fullPath.startsWith(DATA_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const stat = await fs.stat(fullPath).catch(() => null);

    if (!stat) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (stat.isDirectory()) {
      // List directory contents
      const entries = await fs.readdir(fullPath);
      const files: string[] = [];
      const directories: string[] = [];

      for (const entry of entries) {
        const entryStat = await fs.stat(path.join(fullPath, entry));
        if (entryStat.isDirectory()) {
          directories.push(entry);
        } else {
          files.push(entry);
        }
      }

      return NextResponse.json({ files, directories });
    } else {
      // Read file contents
      const content = await fs.readFile(fullPath, 'utf-8');
      return NextResponse.json({ content });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/data
// Body: { path: string, content: string }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Missing path or content' },
        { status: 400 }
      );
    }

    const fullPath = path.join(DATA_DIR, filePath);

    // Security check: ensure path is within DATA_DIR
    if (!fullPath.startsWith(DATA_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
