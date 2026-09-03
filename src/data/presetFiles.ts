import { CodeFile } from '../types';

export const PRESET_FILES: CodeFile[] = [
  {
    id: 'starter-main',
    name: 'main.py',
    language: 'python',
    category: 'General',
    description: 'Starter workspace file. Paste or write your source code here to analyze security and run execution.',
    vulnerabilities: [],
    content: `# Welcome to CodeSentinel Code Security & Execution Workspace!
# Paste, write, or upload any source code here.
# Supports: Python, JavaScript, TypeScript, C, C++, Go, Java, C#, PHP, Ruby, Rust, SQL, Bash, Dockerfile, YAML, JSON.

def main():
    print("Welcome! Press [Run Code] (Ctrl+Enter) to execute your program.")
    print("Press [Deep Scan] to audit security vulnerabilities and get instant AI fixes.")

if __name__ == "__main__":
    main()
`
  }
];

export const LANGUAGE_STARTERS: Record<string, { name: string; content: string; language: string }> = {
  python: {
    name: 'main.py',
    language: 'python',
    content: `def main():
    print("Hello from Python!")

if __name__ == "__main__":
    main()
`
  },
  javascript: {
    name: 'index.js',
    language: 'javascript',
    content: `console.log("Hello from JavaScript / Node.js!");
`
  },
  typescript: {
    name: 'index.ts',
    language: 'typescript',
    content: `interface User {
  name: string;
  role: string;
}

const user: User = { name: "Alice", role: "Security Engineer" };
console.log(\`Hello \${user.name} (\${user.role}) from TypeScript!\`);
`
  },
  c: {
    name: 'main.c',
    language: 'c',
    content: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}
`
  },
  cpp: {
    name: 'main.cpp',
    language: 'cpp',
    content: `#include <iostream>
#include <string>

int main() {
    std::string greeting = "Hello from C++!";
    std::cout << greeting << std::endl;
    return 0;
}
`
  },
  go: {
    name: 'main.go',
    language: 'go',
    content: `package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}
`
  },
  java: {
    name: 'Main.java',
    language: 'java',
    content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`
  },
  csharp: {
    name: 'Program.cs',
    language: 'csharp',
    content: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello from C# (.NET)!");
    }
}
`
  },
  php: {
    name: 'index.php',
    language: 'php',
    content: `<?php
echo "Hello from PHP!\n";
?>
`
  },
  ruby: {
    name: 'main.rb',
    language: 'ruby',
    content: `puts "Hello from Ruby!"
`
  },
  rust: {
    name: 'main.rs',
    language: 'rust',
    content: `fn main() {
    println!("Hello from Rust!");
}
`
  },
  bash: {
    name: 'script.sh',
    language: 'bash',
    content: `#!/usr/bin/env bash
echo "Hello from Bash Shell!"
echo "System date: $(date)"
`
  },
  sql: {
    name: 'query.sql',
    language: 'sql',
    content: `-- SQL Query Playground
SELECT 
    'CodeSentinel Security' AS platform,
    'SQL Engine Active' AS status,
    CURRENT_TIMESTAMP AS executed_at;
`
  },
  dockerfile: {
    name: 'Dockerfile',
    language: 'dockerfile',
    content: `# Hardened Production Container
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
`
  },
  yaml: {
    name: 'config.yaml',
    language: 'yaml',
    content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: web
        image: secure-app:1.0.0
`
  },
  json: {
    name: 'config.json',
    language: 'json',
    content: `{
  "appName": "CodeSentinelApp",
  "version": "1.0.0",
  "security": {
    "tlsEnabled": true,
    "auditLogging": true
  }
}
`
  }
};
