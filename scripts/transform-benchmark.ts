/**
 * Transforms Vitest benchmark JSON output to github-action-benchmark format.
 *
 * Vitest outputs an object with test results, but github-action-benchmark
 * with 'customSmallerIsBetter' expects an array of BenchmarkResult objects.
 *
 * @see https://github.com/benchmark-action/github-action-benchmark
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface VitestBenchmarkResult {
  name: string;
  rank: number;
  rme: number;
  sampleCount: number;
  hz: number;
  min: number;
  max: number;
  mean: number;
  p75: number;
  p99: number;
  p995: number;
  p999: number;
}

interface VitestBenchmarkGroup {
  fullName: string;
  benchmarks: VitestBenchmarkResult[];
}

interface VitestBenchmarkFile {
  filepath: string;
  groups: VitestBenchmarkGroup[];
}

interface VitestBenchmarkOutput {
  files: VitestBenchmarkFile[];
  version?: string;
}

interface GithubActionBenchmarkResult {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

function transformBenchmarks(
  input: VitestBenchmarkOutput
): GithubActionBenchmarkResult[] {
  const results: GithubActionBenchmarkResult[] = [];

  for (const file of input.files) {
    for (const group of file.groups) {
      for (const bench of group.benchmarks) {
        // Skip benchmarks with no data
        if (bench.mean === undefined || bench.hz === undefined) {
          console.warn(`Skipping benchmark "${bench.name}" - missing data`);
          continue;
        }

        // Use mean time (in ms) as the value - smaller is better
        results.push({
          name: `${group.fullName} - ${bench.name}`,
          unit: 'ms',
          value: bench.mean,
          range: `±${bench.rme?.toFixed(2) ?? '0'}%`,
          extra: `${bench.hz.toFixed(2)} ops/sec (${bench.sampleCount ?? 0} samples)`,
        });
      }
    }
  }

  return results;
}

function main(): void {
  const inputPath = process.argv[2] || 'benchmark-results.json';
  const outputPath = process.argv[3] || inputPath;

  const absoluteInputPath = resolve(process.cwd(), inputPath);
  const absoluteOutputPath = resolve(process.cwd(), outputPath);

  console.log(`Reading benchmark results from: ${absoluteInputPath}`);

  const rawContent = readFileSync(absoluteInputPath, 'utf-8');
  const vitestOutput: VitestBenchmarkOutput = JSON.parse(rawContent);

  const transformed = transformBenchmarks(vitestOutput);

  console.log(`Transformed ${transformed.length} benchmark results`);

  writeFileSync(absoluteOutputPath, JSON.stringify(transformed, null, 2));
  console.log(`Wrote transformed results to: ${absoluteOutputPath}`);
}

main();
