/**
 * Squash test-case paths. A `/` inside a name is escaped as `\/`, so only
 * unescaped slashes separate segments. Free of Playwright and Zod: the prune
 * command imports this module directly.
 */

const PATH_SEPARATOR = /(?<!\\)\//;

export function folderPathOf(path: string): string {
  return segmentsOf(path).slice(2, -1).join('/');
}

export function caseNameFromPath(path: string): string {
  return segmentsOf(path).at(-1) ?? '';
}

function segmentsOf(path: string): string[] {
  return path.split(PATH_SEPARATOR).map(segment => segment.replaceAll('\\/', '/'));
}
