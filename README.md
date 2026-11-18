# withedge

**Terminal command boundary control tool. Visualize and audit command execution boundaries.**

## 描述

withedge 通过可视化和审计终端命令的边界控制，帮助开发者理解命令执行的作用范围，防止潜在的安全风险。

## 功能特性

- **命令边界可视化**：将命令转换为边界图
- **作用域分析**：分析命令的潜在影响范围
- **风险评估**：识别潜在的危险操作
- **审计日志**：完整的执行记录

## 安装

```bash
npm install withedge -g
# 或克隆仓库
git clone https://github.com/yourname/withedge.git
cd withedge
npm install
```

## 使用

```bash
# 分析单个命令
withedge analyze "rm -rf /"

# 可视化命令边界
withedge visualize "npm install"

# 批量审计
withedge audit commands.txt
```

## API

```typescript
import { CommandAnalyzer } from 'withedge';

const analyzer = new CommandAnalyzer();
const result = analyzer.analyze('rm -rf /');
console.log(result.boundary);
console.log(result.riskLevel);
```

## 许可证

MIT