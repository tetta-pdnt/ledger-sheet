import { Document, parse, parseDocument, stringify } from 'yaml';

// Cache for parsed documents to preserve comments
const documentCache = new Map<string, Document>();

// Parse YAML string to JavaScript object
export function parseYaml<T>(content: string, cacheKey?: string): T {
  if (cacheKey) {
    const doc = parseDocument(content);
    documentCache.set(cacheKey, doc);
    return doc.toJS() as T;
  }
  return parse(content) as T;
}

// Stringify JavaScript object to YAML
// If we have a cached document, update it to preserve comments
export function stringifyYaml<T>(data: T, cacheKey?: string): string {
  if (cacheKey && documentCache.has(cacheKey)) {
    const doc = documentCache.get(cacheKey)!;
    doc.contents = doc.createNode(data) as Document['contents'];
    return doc.toString();
  }
  return stringify(data, {
    indent: 2,
    lineWidth: 0, // No line wrapping
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });
}

// Clear a specific cache entry
export function clearYamlCache(cacheKey: string): void {
  documentCache.delete(cacheKey);
}

// Clear all cache
export function clearAllYamlCache(): void {
  documentCache.clear();
}

// Get the cached document for advanced manipulation
export function getCachedDocument(cacheKey: string): Document | undefined {
  return documentCache.get(cacheKey);
}

// Create a new document with initial data
export function createYamlDocument<T>(data: T): Document {
  const doc = new Document(data);
  return doc;
}

// Add a comment to the document
export function addHeaderComment(cacheKey: string, comment: string): void {
  const doc = documentCache.get(cacheKey);
  if (doc) {
    doc.commentBefore = comment;
  }
}
