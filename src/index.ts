/**
 * withedge - Terminal command boundary control
 * Core module for command analysis and boundary visualization
 */

export interface CommandBoundary {
  command: string;
  args: string[];
  boundary: {
    scope: 'local' | 'system' | 'network' | 'container';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    paths: string[];
    operations: string[];
  };
  metadata: {
    timestamp: string;
    cwd: string;
    user: string;
  };
}

export interface AnalysisResult {
  boundary: CommandBoundary;
  warnings: string[];
  recommendations: string[];
}

export class CommandAnalyzer {
  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-rf\s+\//, level: 'critical', desc: 'Delete root filesystem' },
    { pattern: /rm\s+-rf\s+~/, level: 'high', desc: 'Delete home directory' },
    { pattern: /dd\s+if=.*of=\/dev\//, level: 'critical', desc: 'Direct disk write' },
    { pattern: /mkfs\./, level: 'high', desc: 'Format filesystem' },
    { pattern: /:\(\)\{ :\|:&\};:/, level: 'critical', desc: 'Fork bomb' },
    { pattern: /chmod\s+-R\s+777\s+\//, level: 'high', desc: 'World-writable root' },
    { pattern: /chown\s+-R\s+.*:.*\s+\//, level: 'high', desc: 'Change ownership of root' },
    { pattern: />\s*\/dev\/sda/, level: 'critical', desc: 'Overwrite disk' },
    { pattern: /curl.*\|\s*bash/, level: 'medium', desc: 'Pipe to shell' },
    { pattern: /wget.*\|\s*bash/, level: 'medium', desc: 'Pipe to shell' },
  ];

  private static readonly SCOPE_KEYWORDS = {
    system: ['systemctl', 'service', 'apt', 'yum', 'pacman', 'dnf', 'rpm', 'dpkg', 'mount', 'umount', 'fdisk', 'parted'],
    network: ['ssh', 'scp', 'rsync', 'curl', 'wget', 'nc', 'netcat', 'telnet', 'ftp', 'sftp', 'iptables', 'ufw', 'firewall-cmd'],
    container: ['docker', 'podman', 'kubectl', 'helm', 'docker-compose', 'containerd', 'crictl'],
  };

  analyze(command: string): AnalysisResult {
    const parts = this.parseCommand(command);
    const scope = this.determineScope(parts[0], parts.slice(1));
    const riskLevel = this.assessRisk(command);
    const paths = this.extractPaths(command);
    const operations = this.extractOperations(parts[0]);

    const boundary: CommandBoundary = {
      command,
      args: parts.slice(1),
      boundary: {
        scope,
        riskLevel,
        paths,
        operations,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        cwd: process.cwd(),
        user: process.env.USER || 'unknown',
      },
    };

    const warnings = this.generateWarnings(boundary);
    const recommendations = this.generateRecommendations(boundary);

    return { boundary, warnings, recommendations };
  }

  private parseCommand(command: string): string[] {
    // Simple shell-like parsing
    return command.trim().split(/\s+/).filter(Boolean);
  }

  private determineScope(cmd: string, args: string[]): CommandBoundary['boundary']['scope'] {
    const base = cmd.split('/').pop() || cmd;
    
    for (const [scope, keywords] of Object.entries(CommandAnalyzer.SCOPE_KEYWORDS)) {
      if (keywords.includes(base)) return scope as CommandBoundary['boundary']['scope'];
      if (args.some(arg => keywords.some(k => arg.includes(k)))) return scope as CommandBoundary['boundary']['scope'];
    }

    // Check for absolute paths suggesting system scope
    if (args.some(arg => arg.startsWith('/etc/') || arg.startsWith('/usr/') || arg.startsWith('/var/') || arg.startsWith('/sys/'))) {
      return 'system';
    }

    return 'local';
  }

  private assessRisk(command: string): CommandBoundary['boundary']['riskLevel'] {
    for (const { pattern, level } of CommandAnalyzer.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) return level as CommandBoundary['boundary']['riskLevel'];
    }
    return 'low';
  }

  private extractPaths(command: string): string[] {
    const pathRegex = /(?:~|\/|\.\/|\.\.\/)[\w\/\-\.\~]*/g;
    const matches = command.match(pathRegex) || [];
    return [...new Set(matches)];
  }

  private extractOperations(cmd: string): string[] {
    const base = cmd.split('/').pop() || cmd;
    const opMap: Record<string, string[]> = {
      rm: ['delete'],
      cp: ['copy'],
      mv: ['move', 'rename'],
      mkdir: ['create-directory'],
      touch: ['create-file'],
      chmod: ['change-permissions'],
      chown: ['change-ownership'],
      systemctl: ['service-control'],
      docker: ['container-operation'],
      git: ['version-control'],
      npm: ['package-management'],
      pip: ['package-management'],
    };
    return opMap[base] || ['execute'];
  }

  private generateWarnings(boundary: CommandBoundary): string[] {
    const warnings: string[] = [];
    if (boundary.boundary.riskLevel === 'critical') {
      warnings.push('CRITICAL: This command may cause irreversible system damage');
    } else if (boundary.boundary.riskLevel === 'high') {
      warnings.push('HIGH RISK: This command modifies critical system resources');
    }
    if (boundary.boundary.scope === 'system') {
      warnings.push('System-level operation detected');
    }
    if (boundary.boundary.scope === 'network') {
      warnings.push('Network operation - verify target');
    }
    return warnings;
  }

  private generateRecommendations(boundary: CommandBoundary): string[] {
    const recs: string[] = [];
    if (boundary.boundary.riskLevel !== 'low') {
      recs.push('Consider running in a container or VM first');
      recs.push('Backup important data before execution');
    }
    if (boundary.boundary.scope === 'system') {
      recs.push('Use --dry-run if available');
    }
    return recs;
  }

  batchAnalyze(commands: string[]): AnalysisResult[] {
    return commands.map(cmd => this.analyze(cmd));
  }
}

export function createAnalyzer(): CommandAnalyzer {
  return new CommandAnalyzer();
}