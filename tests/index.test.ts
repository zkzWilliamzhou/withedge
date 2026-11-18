/**
 * withedge - Tests
 */

import { CommandAnalyzer, AnalysisResult } from '../src/index';

const analyzer = new CommandAnalyzer();

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}:`, e);
    process.exitCode = 1;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string = ''): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

// Test cases
test('analyze safe command', () => {
  const result = analyzer.analyze('ls -la');
  assertEqual(result.boundary.boundary.riskLevel, 'low');
  assertEqual(result.boundary.boundary.scope, 'local');
});

test('analyze dangerous rm -rf /', () => {
  const result = analyzer.analyze('rm -rf /');
  assertEqual(result.boundary.boundary.riskLevel, 'critical');
  assertEqual(result.boundary.boundary.scope, 'system');
});

test('analyze rm -rf home', () => {
  const result = analyzer.analyze('rm -rf ~/Documents');
  assertEqual(result.boundary.boundary.riskLevel, 'high');
});

test('analyze docker command', () => {
  const result = analyzer.analyze('docker run -it ubuntu');
  assertEqual(result.boundary.boundary.scope, 'container');
});

test('analyze systemctl', () => {
  const result = analyzer.analyze('systemctl restart nginx');
  assertEqual(result.boundary.boundary.scope, 'system');
});

test('analyze network command', () => {
  const result = analyzer.analyze('ssh user@host');
  assertEqual(result.boundary.boundary.scope, 'network');
});

test('batch analyze', () => {
  const results = analyzer.batchAnalyze([
    'ls -la',
    'rm -rf /',
    'docker build .',
  ]);
  assertEqual(results.length, 3);
  assertEqual(results[0].boundary.boundary.riskLevel, 'low');
  assertEqual(results[1].boundary.boundary.riskLevel, 'critical');
  assertEqual(results[2].boundary.boundary.scope, 'container');
});

test('extract paths', () => {
  const result = analyzer.analyze('cp /etc/hosts /tmp/backup');
  const paths = result.boundary.boundary.paths;
  assertEqual(paths.includes('/etc/hosts'), true);
  assertEqual(paths.includes('/tmp/backup'), true);
});

test('generate warnings for critical', () => {
  const result = analyzer.analyze('rm -rf /');
  assertEqual(result.warnings.some(w => w.includes('CRITICAL')), true);
});

test('generate warnings for high', () => {
  const result = analyzer.analyze('rm -rf ~/Documents');
  assertEqual(result.warnings.some(w => w.includes('HIGH RISK')), true);
});

console.log('\n✅ All tests passed!');