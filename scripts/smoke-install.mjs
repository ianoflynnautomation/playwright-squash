/**
 * Packs this package and loads it from a temporary CommonJS project.
 * `npm pack` builds `dist/` first.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packJson = execFileSync('npm', ['pack', '--json'], { cwd: root, encoding: 'utf8' });
const packed = JSON.parse(packJson);
const tarball = join(root, packed[0].filename);
const consumer = mkdtempSync(join(tmpdir(), 'playwright-squash-'));

try {
  execFileSync('npm', ['init', '-y'], { cwd: consumer, stdio: 'inherit' });
  execFileSync('npm', ['install', '--no-fund', '--no-audit', tarball, '@playwright/test@1.64.1', 'typescript@6.0.3'], {
    cwd: consumer,
    stdio: 'inherit',
  });
  writeFileSync(
    join(consumer, 'load.cjs'),
    `
const assert = require('node:assert/strict');
const { squash } = require('@ianoflynnautomation/playwright-squash/annotations');
const results = require('@ianoflynnautomation/playwright-squash/results');
const sync = require('@ianoflynnautomation/playwright-squash/sync');
const select = require('@ianoflynnautomation/playwright-squash/select');

const annotations = squash({ weight: 'medium', status: 'approved', nature: 'functional', type: 'regression' });
assert.ok(Array.isArray(annotations) && annotations.length > 0);

for (const [name, loaded] of [['results', results], ['sync', sync], ['select', select]]) {
  const Reporter = loaded.default ?? loaded;
  assert.equal(typeof Reporter, 'function', name);
  const reporter = new Reporter();
  assert.equal(typeof reporter.onEnd, 'function', name + '.onEnd');
}
console.log('installed package exports loaded');
`,
  );
  execFileSync('node', ['load.cjs'], { cwd: consumer, stdio: 'inherit' });

  writeFileSync(
    join(consumer, 'import-check.ts'),
    `import { squash } from '@ianoflynnautomation/playwright-squash/annotations';
export const annotations = squash({ weight: 'low', status: 'work in progress', nature: 'functional', type: 'regression' });
`,
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        files: ['import-check.ts'],
      },
      null,
      2,
    ),
  );
  execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: consumer, stdio: 'inherit' });
  console.log('consumer typecheck passed');
} finally {
  rmSync(consumer, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
