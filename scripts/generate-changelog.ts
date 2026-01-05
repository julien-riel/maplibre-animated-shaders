#!/usr/bin/env tsx
/**
 * Generate CHANGELOG entries from conventional commits
 *
 * This script analyzes git commits since the last tag and generates
 * CHANGELOG entries following Keep a Changelog format.
 *
 * Usage:
 *   npx tsx scripts/generate-changelog.ts           # Preview changes
 *   npx tsx scripts/generate-changelog.ts --write   # Update CHANGELOG.md
 *   npx tsx scripts/generate-changelog.ts --version 1.2.0  # Specify version
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Commit {
  hash: string;
  type: string;
  scope: string | null;
  breaking: boolean;
  message: string;
  body: string;
}

interface ChangelogSection {
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
  breaking: string[];
}

const COMMIT_TYPES: Record<string, keyof ChangelogSection> = {
  feat: 'added',
  fix: 'fixed',
  perf: 'changed',
  refactor: 'changed',
  docs: 'changed',
  style: 'changed',
  test: 'changed',
  build: 'changed',
  ci: 'changed',
  chore: 'changed',
  revert: 'removed',
  security: 'security',
  deprecate: 'deprecated',
};

function getLastTag(): string | null {
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag: string | null): string {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  try {
    return execSync(
      `git log ${range} --pretty=format:"%H|%s|%b|||" --no-merges`,
      { encoding: 'utf8' }
    );
  } catch {
    return '';
  }
}

function parseConventionalCommit(hash: string, subject: string, body: string): Commit | null {
  // Match conventional commit format: type(scope)!: message
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!match) return null;

  const [, type, scope, bang, message] = match;
  const breaking = bang === '!' || body.includes('BREAKING CHANGE:');

  return {
    hash: hash.substring(0, 7),
    type: type.toLowerCase(),
    scope: scope || null,
    breaking,
    message,
    body,
  };
}

function parseCommits(rawOutput: string): Commit[] {
  if (!rawOutput.trim()) return [];

  const commits: Commit[] = [];
  const entries = rawOutput.split('|||').filter(Boolean);

  for (const entry of entries) {
    const [hash, subject, ...bodyParts] = entry.split('|');
    if (!hash || !subject) continue;

    const body = bodyParts.join('|').trim();
    const commit = parseConventionalCommit(hash.trim(), subject.trim(), body);
    if (commit) {
      commits.push(commit);
    }
  }

  return commits;
}

function categorizeCommits(commits: Commit[]): ChangelogSection {
  const sections: ChangelogSection = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
    breaking: [],
  };

  for (const commit of commits) {
    const section = COMMIT_TYPES[commit.type];
    if (!section) continue;

    const scope = commit.scope ? `**${commit.scope}:** ` : '';
    const entry = `${scope}${commit.message} ([${commit.hash}])`;

    if (commit.breaking) {
      sections.breaking.push(entry);
    } else {
      sections[section].push(entry);
    }
  }

  return sections;
}

function formatChangelog(version: string, date: string, sections: ChangelogSection): string {
  const lines: string[] = [];

  lines.push(`## [${version}] - ${date}`);
  lines.push('');

  if (sections.breaking.length > 0) {
    lines.push('### ⚠️ BREAKING CHANGES');
    lines.push('');
    sections.breaking.forEach((entry) => lines.push(`- ${entry}`));
    lines.push('');
  }

  const sectionOrder: Array<[keyof ChangelogSection, string]> = [
    ['added', '### Added'],
    ['changed', '### Changed'],
    ['deprecated', '### Deprecated'],
    ['removed', '### Removed'],
    ['fixed', '### Fixed'],
    ['security', '### Security'],
  ];

  for (const [key, title] of sectionOrder) {
    if (sections[key].length > 0) {
      lines.push(title);
      lines.push('');
      sections[key].forEach((entry) => lines.push(`- ${entry}`));
      lines.push('');
    }
  }

  return lines.join('\n');
}

function updateChangelogFile(changelogPath: string, newEntry: string): void {
  let content = '';

  if (existsSync(changelogPath)) {
    content = readFileSync(changelogPath, 'utf8');
  } else {
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  }

  // Find the first version section or end of header
  const insertIndex = content.search(/^## \[/m);
  if (insertIndex === -1) {
    // No existing versions, append at end
    content = content.trimEnd() + '\n\n' + newEntry;
  } else {
    // Insert before first version
    content = content.slice(0, insertIndex) + newEntry + '\n' + content.slice(insertIndex);
  }

  writeFileSync(changelogPath, content);
}

function getNextVersion(lastTag: string | null): string {
  if (!lastTag) return '1.0.0';

  const version = lastTag.replace(/^v/, '');
  const parts = version.split('.').map(Number);

  // Default to minor version bump
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;

  return parts.join('.');
}

function main(): void {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes('--write');
  const versionArg = args.find((arg) => arg.startsWith('--version='));
  const customVersion = versionArg?.split('=')[1];

  const projectRoot = join(__dirname, '..');
  const changelogPath = join(projectRoot, 'CHANGELOG.md');

  const lastTag = getLastTag();
  const version = customVersion || getNextVersion(lastTag);
  const date = new Date().toISOString().split('T')[0];

  console.log(`Generating changelog for version ${version}`);
  console.log(`Last tag: ${lastTag || '(none)'}`);
  console.log('');

  const rawCommits = getCommitsSinceTag(lastTag);
  const commits = parseCommits(rawCommits);

  if (commits.length === 0) {
    console.log('No conventional commits found since last tag.');
    process.exit(0);
  }

  console.log(`Found ${commits.length} conventional commits:`);
  commits.forEach((c) => {
    const flag = c.breaking ? ' [BREAKING]' : '';
    console.log(`  - ${c.type}${c.scope ? `(${c.scope})` : ''}: ${c.message}${flag}`);
  });
  console.log('');

  const sections = categorizeCommits(commits);
  const changelogEntry = formatChangelog(version, date, sections);

  console.log('Generated changelog entry:');
  console.log('---');
  console.log(changelogEntry);
  console.log('---');

  if (shouldWrite) {
    updateChangelogFile(changelogPath, changelogEntry);
    console.log(`\n✅ Updated ${changelogPath}`);
  } else {
    console.log('\nRun with --write to update CHANGELOG.md');
  }
}

main();
