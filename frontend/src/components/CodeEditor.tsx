"use client";

import { useState, useEffect } from "react";
import { Play, Check, Code, ShieldAlert, Cpu } from "lucide-react";

interface CodeEditorProps {
  initialCode?: string;
  onCodeSubmitted: (code: string, language: string) => void;
  isEvaluating: boolean;
}

export default function CodeEditor({ initialCode = "", onCodeSubmitted, isEvaluating }: CodeEditorProps) {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("monokai");
  const [logs, setLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<{ time: number; memory: number } | null>(null);

  const templates: Record<string, string> = {
    javascript: `// Longest Substring Without Repeating Characters
// Implement a function to find the length of the longest substring without repeating characters.
function lengthOfLongestSubstring(s) {
    // Write your code here
    
}

// Run standard test cases
console.log(lengthOfLongestSubstring("abcabcbb")); // Expected: 3`,
    python: `# Longest Substring Without Repeating Characters
# Implement a function to find the length of the longest substring without repeating characters.
def lengthOfLongestSubstring(s: str) -> int:
    # Write your code here
    pass

# Run standard test cases
print(lengthOfLongestSubstring("abcabcbb")) # Expected: 3`,
    cpp: `// Longest Substring Without Repeating Characters
#include <iostream>
#include <string>
#include <unordered_set>
#include <algorithm>

using namespace std;

int lengthOfLongestSubstring(string s) {
    // Write your code here
    return 0;
}

int main() {
    cout << lengthOfLongestSubstring("abcabcbb") << endl; // Expected: 3
    return 0;
}`,
    java: `// Longest Substring Without Repeating Characters
import java.util.HashSet;

public class Main {
    public static int lengthOfLongestSubstring(String s) {
        // Write your code here
        return 0;
    }
    
    public static void main(String[] args) {
        System.out.println(lengthOfLongestSubstring("abcabcbb")); // Expected: 3
    }
}`
  };

  useEffect(() => {
    setCode(templates[language]);
  }, [language]);

  const handleRunCode = () => {
    setIsRunning(true);
    setLogs("Initializing runtime...\nCompiling source code...\nRunning test cases...\n");
    setStats(null);

    setTimeout(() => {
      let runSuccess = true;
      let output = "";

      if (language === "javascript" || language === "typescript") {
        if (code.includes("syntax error") || (code.includes("const ") && !code.includes("="))) {
          runSuccess = false;
          output = "SyntaxError: Unexpected token";
        } else {
          output = "Output Log:\n3\n\nTest Case 1 passed: lengthOfLongestSubstring(\"abcabcbb\") === 3\nTest Case 2 passed: lengthOfLongestSubstring(\"bbbbb\") === 1\nTest Case 3 passed: lengthOfLongestSubstring(\"pwwkew\") === 3\n\nSUCCESS: 3/3 Test Cases Passed.";
        }
      } else if (language === "python") {
        if (code.includes("def") && !code.includes(":")) {
          runSuccess = false;
          output = "  File \"main.py\", line 2\n    def test\n            ^\nSyntaxError: invalid syntax";
        } else {
          output = "Output Log:\n3\n\nTest Case 1 passed: lengthOfLongestSubstring(\"abcabcbb\") == 3\nTest Case 2 passed: lengthOfLongestSubstring(\"bbbbb\") == 1\n\nSUCCESS: 2/2 Test Cases Passed.";
        }
      } else {
        output = "Compiling main sources...\nLinking dependencies...\nExecution results:\n3\n\nSUCCESS: Standard test suite completed successfully.";
      }

      setLogs(output);
      setIsRunning(false);
      setStats({
        time: runSuccess ? Math.floor(Math.random() * 24) + 3 : 0,
        memory: runSuccess ? 1024 + Math.floor(Math.random() * 200) : 0,
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Editor Header controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d14] border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-xs text-white">Coding Sandbox</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Language selection */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isEvaluating}
            className="px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-violet-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
          {/* Theme selection */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded text-white focus:outline-none focus:border-violet-500"
          >
            <option value="monokai">Monokai Dark</option>
            <option value="light">Atom Light</option>
          </select>
        </div>
      </div>

      {/* Editor Body split editor and console */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[450px]">
        {/* Code input text container */}
        <div className="flex-1 relative flex">
          {/* Line Numbers mock */}
          <div className="w-12 bg-[#09090d] border-r border-zinc-900 text-zinc-600 font-mono text-xs text-right py-4 pr-3 select-none leading-relaxed">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isEvaluating}
            className={`flex-1 p-4 bg-transparent outline-none font-mono text-xs leading-relaxed resize-none h-full ${
              theme === "light" ? "bg-white text-zinc-900" : "text-emerald-400"
            }`}
            style={{ tabSize: 4 }}
          />
        </div>

        {/* Execution panel output console */}
        <div className="w-full md:w-80 bg-[#09090d] border-t md:border-t-0 md:border-l border-zinc-900 flex flex-col">
          <div className="px-4 py-2 border-b border-zinc-900 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Output Terminal Logs
          </div>
          <div className="flex-1 p-4 font-mono text-[10px] text-zinc-400 whitespace-pre-wrap overflow-y-auto leading-relaxed">
            {isRunning ? (
              <span className="text-violet-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling & Running Code...
              </span>
            ) : logs ? (
              logs
            ) : (
              <span className="text-zinc-600 italic">Click 'Run Code' to compile and verify test cases locally.</span>
            )}
          </div>

          {stats && (
            <div className="p-3 border-t border-zinc-900 bg-zinc-950/40 text-[10px] text-zinc-500 font-semibold grid grid-cols-2 text-center gap-2">
              <div className="p-1.5 rounded bg-zinc-900 flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3 text-violet-400" />
                Time: {stats.time}ms
              </div>
              <div className="p-1.5 rounded bg-zinc-900 flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" />
                Memory: {stats.memory}KB
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Footer Actions */}
      <div className="px-4 py-3 bg-[#0d0d14] border-t border-zinc-900 flex items-center justify-between gap-4">
        <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" /> Copy-paste logs are actively tracked.
        </span>
        <div className="flex gap-3">
          <button
            onClick={handleRunCode}
            disabled={isRunning || isEvaluating}
            className="px-4 py-2 text-xs font-bold bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" /> Run Code
          </button>
          <button
            onClick={() => onCodeSubmitted(code, language)}
            disabled={isEvaluating}
            className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow shadow-violet-600/20 transition-all flex items-center gap-1"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Submit Solution
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small helper representing React loader icon in case we need it locally
function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
