// Test script to verify the models parser functionality
const { ModelsParser, parseModelsFile } = require('./packages/server/dist/lib/import/models-parser.js');

// Test sample Python code with AGENT_CONFIGS
const samplePythonCode = `
# Sample models.py file
from typing import Dict, List

AGENT_CONFIGS = {
    "coder": {
        "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        "mcp_servers": ["context7"],
        "mcp_servers_optional": ["linear", "electron"],
        "auto_claude_tools": [],
        "thinking_default": "medium"
    },
    "planner": {
        "tools": ["Read", "Glob", "Grep"],
        "mcp_servers": ["context7"],
        "mcp_servers_optional": ["linear"],
        "auto_claude_tools": [],
        "thinking_default": "high"
    }
}
`;

console.log('Testing ModelsParser...');

try {
  const parser = new ModelsParser(samplePythonCode);
  const result = parser.parseAgentConfigs();

  console.log('Parsed AGENT_CONFIGS:');
  console.log(JSON.stringify(result, null, 2));

  if (result && result.coder && result.planner) {
    console.log('✅ Parser successfully extracted AGENT_CONFIGS');
  } else {
    console.log('❌ Parser failed to extract expected configs');
  }
} catch (error) {
  console.error('❌ Parser test failed:', error.message);
}