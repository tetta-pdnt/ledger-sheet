'use client';

// API-based file handler for reading/writing files via Next.js API routes

export interface FileSystemState {
  isSupported: boolean;
  directoryHandle: null; // No longer used
  fileHandles: Map<string, never>;
}

// Always supported when using API
export function isFileSystemSupported(): boolean {
  return true;
}

// No longer needed - returns true for compatibility
export async function openDirectory(): Promise<true> {
  return true;
}

// Read a file via API
export async function readFile(filename: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/data?path=${encodeURIComponent(filename)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

// Read a file from a subdirectory via API
export async function readFileFromSubdir(
  dirname: string,
  filename: string
): Promise<string | null> {
  const path = `${dirname}/${filename}`;
  return readFile(path);
}

// Write content to a file via API
export async function writeFile(filename: string, content: string): Promise<void> {
  const response = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filename, content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to write file: ${response.statusText}`);
  }
}

// Write content to a file in a subdirectory via API
export async function writeFileToSubdir(
  dirname: string,
  filename: string,
  content: string
): Promise<void> {
  const path = `${dirname}/${filename}`;
  return writeFile(path, content);
}

// List files in the root directory via API
export async function listFiles(): Promise<string[]> {
  try {
    const response = await fetch('/api/data?path=&list=true');
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// List files in a subdirectory via API
export async function listFilesInSubdir(dirname: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/data?path=${encodeURIComponent(dirname)}&list=true`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing files in subdir:', error);
    return [];
  }
}

// Check if a file exists via API
export async function fileExists(filename: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/data?path=${encodeURIComponent(filename)}`);
    return response.ok;
  } catch {
    return false;
  }
}

// Check if a directory exists via API
export async function directoryExists(dirname: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/data?path=${encodeURIComponent(dirname)}&list=true`);
    return response.ok;
  } catch {
    return false;
  }
}

// Get the current directory handle - no longer used
export function getDirectoryHandle(): null {
  return null;
}

// Set directory handle - no longer used
export function setDirectoryHandle(): void {
  // No-op
}

// Clear cached handles - no-op for API version
export function clearHandles(): void {
  // No-op
}

// Legacy fallback functions - redirect to main functions
export async function openFileFallback(): Promise<{ name: string; content: string } | null> {
  return null;
}

export async function saveFileFallback(content: string, filename: string): Promise<void> {
  await writeFile(filename, content);
}

export async function openMultipleFilesFallback(): Promise<Array<{ name: string; content: string }>> {
  return [];
}
