#!/usr/bin/env node
/**
 * withedge CLI
 * Command-line interface for terminal command boundary analysis
 */

import { CommandAnalyzer, AnalysisResult } from './index.js';
import { readFileSync } from 'fs';

const analyzer = new CommandAnalyzer();

function printResult(result: AnalysisResult, format: 'text' | 'json' = 'text'): void {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const { boundary, warnings, recommendations } = result;
  
  console.log('\n=== Command Boundary Analysis ===');
  console.log(`Command: ${boundary.command}`);
  console.log(`Scope: ${boundary.boundary.scope}`);
  console.log(`Risk Level: ${boundary.boundary.riskLevel.toUpperCase()}`);
  console.log(`Paths: ${boundary.boundary.paths.join(', ') || 'none'}`);
  console.log(`Operations: ${boundary.boundary.operations.join(', ')}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(r => console.log(`  - ${r}`));
  }
  
  console.log('\nMetadata:');
  console.log(`  Timestamp: ${boundary.metadata.timestamp}`);
  console.log(`  CWD: ${boundary.metadata.cwd}`);
  console.log(`  User: ${boundary.metadata.user}`);
}

function showHelp(): void {
  console.log(`
withedge - Terminal command boundary control

Usage:
  withedge analyze <command>     Analyze a single command
  withedge visualize <command>   Generate boundary visualization (Mermaid)
  withedge audit <file>          Batch audit commands from file
  withedge help                  Show this help

Examples:
  withedge analyze "rm -rf /tmp/test"
  withedge visualize "docker run -it ubuntu"
  withedge audit commands.txt
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    return;
  }

  const command = args[0];
  
  switch (command) {
    case 'analyze': {
      const cmd = args.slice(1).join(' ');
      if (!cmd) {
        console.error('Error: No command provided');
        process.exit(1);
      }
      const result = analyzer.analyze(cmd);
      printResult(result, 'text');
      break;
    }
    
    case 'visualize': {
      const cmd = args.slice(1).join(' ');
      if (!cmd) {
        console.error('Error: No command provided');
        process.exit(1);
      }
      const result = analyzer.analyze(cmd);
      console.log(generateMermaid(result));
      break;
    }
    
    case 'audit': {
      const file = args[1];
      if (!file) {
        console.error('Error: No file provided');
        process.exit(1);
      }
      try {
        const content = readFileSync(file, 'utf-8');
        const commands = content.split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
        const results = analyzer.batchAnalyze(commands);
        
        console.log(`\n=== Batch Audit Results (${results.length} commands) ===`);
        results.forEach((r, i) => {
          console.log(`\n[${i + 1}] ${r.boundary.command}`);
          console.log(`    Scope: ${r.boundary.boundary.scope} | Risk: ${r.boundary.boundary.riskLevel}`);
          if (r.warnings.length) r.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
        });
        
        const critical = results.filter(r => r.boundary.boundary.riskLevel === 'critical').length;
        const high = results.filter(r => r.boundary.boundary.riskLevel === 'high').length;
        console.log(`\nSummary: ${critical} critical, ${high} high, ${results.length - critical - high} low/medium`);
      } catch (e) {
        console.error('Error reading file:', e);
        process.exit(1);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function generateMermaid(result: AnalysisResult): string {
  const { boundary } = result;
  const id = 'cmd';
  
  let mermaid = 'graph TD\n';
  mermaid += `  ${id}["${boundary.command}"]\n`;
  mermaid += `  ${id} --> scope["Scope: ${boundary.boundary.scope}"]\n`;
  mermaid += `  ${id} --> risk["Risk: ${boundary.boundary.riskLevel}"]\n`;
  
  boundary.boundary.paths.forEach((p, i) => {
    mermaid += `  ${id} --> path${i}["Path: ${p}"]\n`;
  });
  
  boundary.boundary.operations.forEach((op, i) => {
    mermaid += `  ${id} --> op${i}["Op: ${op}"]\n`;
  });
  
  // Style based on risk
  const riskColor = {
    low: '#4caf50',
    medium: '#ff9800', 
    high: '#f44336',
    critical: '#b71c1c'
  };
  
  mermaid += `\n  classDef risk fill:${riskColor[boundary.boundary.riskLevel]},color:#fff;\n`;
  mermaid += `  class risk risk;\n`;
  
  return mermaid;
}

main().catch(console.error);