#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../logs');

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Função para colorir logs por nível
const colorizeLevel = (level) => {
  switch (level) {
    case 'ERROR': return `${colors.red}${level}${colors.reset}`;
    case 'WARN': return `${colors.yellow}${level}${colors.reset}`;
    case 'INFO': return `${colors.green}${level}${colors.reset}`;
    case 'DEBUG': return `${colors.blue}${level}${colors.reset}`;
    default: return level;
  }
};

// Função para exibir logs de um arquivo
const displayLogs = (filename, lines = 50) => {
  const logPath = path.join(logsDir, filename);
  
  if (!fs.existsSync(logPath)) {
    console.log(`${colors.yellow}Arquivo de log não encontrado: ${filename}${colors.reset}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const logLines = content.trim().split('\n').slice(-lines);
    
    console.log(`\n${colors.cyan}=== ${filename.toUpperCase()} (últimas ${lines} linhas) ===${colors.reset}`);
    
    logLines.forEach(line => {
      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line);
          const timestamp = new Date(logEntry.timestamp).toLocaleString('pt-BR');
          const level = colorizeLevel(logEntry.level);
          
          console.log(`[${timestamp}] ${level}: ${logEntry.message}`);
          
          if (logEntry.error) {
            console.log(`${colors.red}  Error: ${logEntry.error.message}${colors.reset}`);
            if (process.argv.includes('--stack')) {
              console.log(`${colors.red}  Stack: ${logEntry.error.stack}${colors.reset}`);
            }
          }
        } catch (e) {
          // Se não for JSON válido, exibir linha como está
          console.log(line);
        }
      }
    });
  } catch (error) {
    console.error(`${colors.red}Erro ao ler arquivo de log: ${error.message}${colors.reset}`);
  }
};

// Função para listar arquivos de log disponíveis
const listLogFiles = () => {
  if (!fs.existsSync(logsDir)) {
    console.log(`${colors.yellow}Diretório de logs não encontrado: ${logsDir}${colors.reset}`);
    return [];
  }
  
  const files = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
  return files;
};

// Função principal
const main = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      console.log(`${colors.cyan}Arquivos de log disponíveis:${colors.reset}`);
      const files = listLogFiles();
      files.forEach(file => console.log(`  - ${file}`));
      break;
      
    case 'errors':
      displayLogs('errors.log', parseInt(args[1]) || 50);
      break;
      
    case 'backend':
      displayLogs('backend.log', parseInt(args[1]) || 50);
      break;
      
    case 'assets':
      displayLogs('assets.log', parseInt(args[1]) || 50);
      break;
      
    case 'api':
      displayLogs('api.log', parseInt(args[1]) || 50);
      break;
      
    case 'database':
      displayLogs('database.log', parseInt(args[1]) || 50);
      break;
      
    case 'system':
      displayLogs('system.log', parseInt(args[1]) || 50);
      break;
      
    case 'app':
      displayLogs('app.log', parseInt(args[1]) || 50);
      break;
      
    case 'all':
      const allFiles = listLogFiles();
      allFiles.forEach(file => displayLogs(file, 20));
      break;
      
    case 'watch':
      const watchFile = args[1] || 'errors.log';
      console.log(`${colors.cyan}Monitorando ${watchFile}... (Ctrl+C para sair)${colors.reset}`);
      
      const watchPath = path.join(logsDir, watchFile);
      if (fs.existsSync(watchPath)) {
        fs.watchFile(watchPath, (curr, prev) => {
          if (curr.mtime > prev.mtime) {
            // Ler apenas as novas linhas
            const content = fs.readFileSync(watchPath, 'utf8');
            const lines = content.trim().split('\n');
            const newLines = lines.slice(-5); // Últimas 5 linhas
            
            newLines.forEach(line => {
              if (line.trim()) {
                try {
                  const logEntry = JSON.parse(line);
                  const timestamp = new Date(logEntry.timestamp).toLocaleString('pt-BR');
                  const level = colorizeLevel(logEntry.level);
                  console.log(`[${timestamp}] ${level}: ${logEntry.message}`);
                } catch (e) {
                  console.log(line);
                }
              }
            });
          }
        });
      } else {
        console.log(`${colors.red}Arquivo não encontrado: ${watchFile}${colors.reset}`);
      }
      break;
      
    default:
      console.log(`${colors.cyan}Sistema de Visualização de Logs${colors.reset}

Uso: node scripts/view-logs.js <comando> [opções]

Comandos:
  list                    - Lista todos os arquivos de log
  errors [linhas]         - Mostra log de erros (padrão: 50 linhas)
  backend [linhas]        - Mostra log do backend
  assets [linhas]         - Mostra log de assets
  api [linhas]            - Mostra log de API
  database [linhas]       - Mostra log do banco de dados
  system [linhas]         - Mostra log do sistema
  app [linhas]            - Mostra log da aplicação
  all                     - Mostra todos os logs (20 linhas cada)
  watch [arquivo]         - Monitora arquivo em tempo real

Opções:
  --stack                 - Mostra stack trace completo dos erros

Exemplos:
  node scripts/view-logs.js errors 100
  node scripts/view-logs.js watch errors.log
  node scripts/view-logs.js backend --stack
`);
  }
};

main();