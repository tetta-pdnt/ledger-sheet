'use client';

import { fileOpen, fileSave, directoryOpen, supported } from 'browser-fs-access';

// Extend FileSystemDirectoryHandle with iterator methods
interface ExtendedFileSystemDirectoryHandle extends FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

export interface FileSystemState {
  isSupported: boolean;
  directoryHandle: FileSystemDirectoryHandle | null;
  fileHandles: Map<string, FileSystemFileHandle>;
}

const state: FileSystemState = {
  isSupported: false,
  directoryHandle: null,
  fileHandles: new Map(),
};

// Check if File System Access API is supported
export function isFileSystemSupported(): boolean {
  if (typeof window === 'undefined') return false;
  state.isSupported = supported;
  return state.isSupported;
}

// Open a directory and store the handle
export async function openDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await (window as typeof window & {
      showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
    }).showDirectoryPicker({
      mode: 'readwrite',
    });
    state.directoryHandle = handle;
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

// Get or create a file handle
async function getFileHandle(
  filename: string,
  create: boolean = false
): Promise<FileSystemFileHandle | null> {
  if (!state.directoryHandle) {
    throw new Error('No directory selected');
  }

  // Check cache first
  if (state.fileHandles.has(filename)) {
    return state.fileHandles.get(filename)!;
  }

  try {
    const handle = await state.directoryHandle.getFileHandle(filename, { create });
    state.fileHandles.set(filename, handle);
    return handle;
  } catch (error) {
    if ((error as Error).name === 'NotFoundError' && !create) {
      return null;
    }
    throw error;
  }
}

// Get or create a subdirectory handle
async function getSubdirectoryHandle(
  dirname: string,
  create: boolean = false
): Promise<FileSystemDirectoryHandle | null> {
  if (!state.directoryHandle) {
    throw new Error('No directory selected');
  }

  try {
    return await state.directoryHandle.getDirectoryHandle(dirname, { create });
  } catch (error) {
    if ((error as Error).name === 'NotFoundError' && !create) {
      return null;
    }
    throw error;
  }
}

// Read a file as text
export async function readFile(filename: string): Promise<string | null> {
  const handle = await getFileHandle(filename, false);
  if (!handle) return null;

  const file = await handle.getFile();
  return await file.text();
}

// Read a file from a subdirectory
export async function readFileFromSubdir(
  dirname: string,
  filename: string
): Promise<string | null> {
  const dirHandle = await getSubdirectoryHandle(dirname, false);
  if (!dirHandle) return null;

  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    if ((error as Error).name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}

// Write content to a file
export async function writeFile(filename: string, content: string): Promise<void> {
  const handle = await getFileHandle(filename, true);
  if (!handle) {
    throw new Error(`Failed to create file: ${filename}`);
  }

  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Write content to a file in a subdirectory
export async function writeFileToSubdir(
  dirname: string,
  filename: string,
  content: string
): Promise<void> {
  const dirHandle = await getSubdirectoryHandle(dirname, true);
  if (!dirHandle) {
    throw new Error(`Failed to create directory: ${dirname}`);
  }

  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

// List files in the root directory
export async function listFiles(): Promise<string[]> {
  if (!state.directoryHandle) {
    throw new Error('No directory selected');
  }

  const files: string[] = [];
  const handle = state.directoryHandle as ExtendedFileSystemDirectoryHandle;
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      files.push(entry.name);
    }
  }
  return files;
}

// List files in a subdirectory
export async function listFilesInSubdir(dirname: string): Promise<string[]> {
  const dirHandle = await getSubdirectoryHandle(dirname, false);
  if (!dirHandle) return [];

  const files: string[] = [];
  const handle = dirHandle as ExtendedFileSystemDirectoryHandle;
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      files.push(entry.name);
    }
  }
  return files;
}

// Check if a file exists
export async function fileExists(filename: string): Promise<boolean> {
  const handle = await getFileHandle(filename, false);
  return handle !== null;
}

// Check if a directory exists
export async function directoryExists(dirname: string): Promise<boolean> {
  const handle = await getSubdirectoryHandle(dirname, false);
  return handle !== null;
}

// Get the current directory handle
export function getDirectoryHandle(): FileSystemDirectoryHandle | null {
  return state.directoryHandle;
}

// Set directory handle (for restoring from IndexedDB)
export function setDirectoryHandle(handle: FileSystemDirectoryHandle): void {
  state.directoryHandle = handle;
}

// Clear cached handles
export function clearHandles(): void {
  state.directoryHandle = null;
  state.fileHandles.clear();
}

// Fallback: Open file using file input
export async function openFileFallback(
  extensions: string[] = ['.yaml', '.yml']
): Promise<{ name: string; content: string } | null> {
  try {
    const blob = await fileOpen({
      extensions,
      description: 'YAML files',
    });
    const content = await blob.text();
    return { name: blob.name, content };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

// Fallback: Save file using download
export async function saveFileFallback(
  content: string,
  filename: string
): Promise<void> {
  const blob = new Blob([content], { type: 'text/yaml' });
  await fileSave(blob, {
    fileName: filename,
    extensions: ['.yaml', '.yml'],
  });
}

// Open multiple files at once (fallback)
export async function openMultipleFilesFallback(): Promise<
  Array<{ name: string; content: string }>
> {
  try {
    const blobs = await directoryOpen({
      recursive: true,
    });

    const files: Array<{ name: string; content: string }> = [];
    for (const blob of blobs) {
      if (blob.name.endsWith('.yaml') || blob.name.endsWith('.yml')) {
        const content = await blob.text();
        files.push({ name: blob.name, content });
      }
    }
    return files;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return [];
    }
    throw error;
  }
}
