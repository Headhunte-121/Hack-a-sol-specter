#!/usr/bin/env node
/**
 * pack-project.js
 * Zero-dependency Node.js utility for Hack-a-sol-specter (Node.js v24 compatible):
 *   1. Default: Exports clean ASCII folder tree + all source code into `project_bundle.txt`
 *      (skips node_modules, .git, dist, lockfiles, binaries, .env secrets, large data dumps).
 *   2. --clip: Also copies the exported structure + code directly to your Windows/macOS/Linux clipboard.
 *   3. --copy <destDir>: Copies the clean project directory without unnecessary folders/files.
 *   4. --clean [--dry-run]: Removes unnecessary build/cache/junk files from the project.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = process.cwd();
const SCRIPT_NAME = path.basename(__filename);
const OUTPUT_FILE = "project_bundle.txt";
const NL = String.fromCharCode(10);
const CRLF_REGEX = new RegExp(String.fromCharCode(13, 10), "g");

// Directories excluded when bundling code or making a clean project copy
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  ".vercel",
  ".netlify",
  ".venv",
  "venv",
  "env",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".idea",
  ".vscode",
  "coverage",
  ".turbo",
  ".cache",
  "tmp",
  "temp",
]);

// Files excluded from text code dump (lockfiles, secrets, OS junk, generated output)
const IGNORED_FILES = new Set([
  SCRIPT_NAME,
  OUTPUT_FILE,
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
]);

// Binary / media / model weight extensions excluded from text code dump
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tiff",
  ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".mp4", ".webm", ".avi", ".mov",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".joblib", ".pkl", ".pickle", ".onnx", ".pt", ".pth", ".bin", ".safetensors", ".h5",
  ".pyc", ".pyo", ".exe", ".dll", ".so", ".dylib",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".sqlite", ".db",
]);

// Junk targets removed during --clean
const CLEAN_DIR_TARGETS = new Set([
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "coverage",
  ".turbo",
  ".cache",
  "tmp",
  "temp",
]);

const CLEAN_FILE_TARGETS = new Set([
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  "npm-debug.log",
  "yarn-error.log",
]);

const MAX_CODE_FILE_BYTES = 300 * 1024; // Skip giant CSV/data files > 300 KB in text bundle

function isBinaryBuffer(buffer) {
  const sampleLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < sampleLen; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function shouldIgnoreEntry(name, isDir, mode = "bundle") {
  if (isDir) {
    return IGNORED_DIRS.has(name);
  }
  if (name === ".DS_Store" || name === "Thumbs.db" || name === "desktop.ini") {
    return true;
  }
  if (mode === "bundle") {
    if (IGNORED_FILES.has(name)) return true;
    if (name.startsWith(".env.") && name !== ".env.example") return true;
    const ext = path.extname(name).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return true;
  }
  return false;
}

function buildTreeAndCollectFiles(dir, prefix = "", relBase = "", collected = []) {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !shouldIgnoreEntry(entry.name, entry.isDirectory(), "bundle"))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  let treeLines = [];

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const nextPrefix = prefix + (isLast ? "    " : "│   ");
    const fullPath = path.join(dir, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      treeLines.push(`${prefix}${connector}${entry.name}/`);
      const child = buildTreeAndCollectFiles(fullPath, nextPrefix, relPath, collected);
      treeLines = treeLines.concat(child.treeLines);
    } else {
      treeLines.push(`${prefix}${connector}${entry.name}`);
      collected.push({ fullPath, relPath });
    }
  });

  return { treeLines, collected };
}

function exportBundle(copyToClipboard = false) {
  const rootName = path.basename(ROOT_DIR);
  const { treeLines, collected } = buildTreeAndCollectFiles(ROOT_DIR);

  const sections = [];
  sections.push("================================================================================");
  sections.push(`PROJECT STRUCTURE: ${rootName}`);
  sections.push("================================================================================");
  sections.push(`${rootName}/`);
  sections.push(...treeLines);
  sections.push("");
  sections.push("================================================================================");
  sections.push("SOURCE CODE FILES");
  sections.push("================================================================================");

  let includedCount = 0;
  let skippedLargeOrBinary = 0;

  for (const file of collected) {
    const stat = fs.statSync(file.fullPath);
    if (stat.size > MAX_CODE_FILE_BYTES) {
      skippedLargeOrBinary++;
      sections.push("");
      sections.push(`--- FILE: ${file.relPath} [SKIPPED: ${(stat.size / 1024).toFixed(1)} KB > 300 KB limit] ---`);
      continue;
    }

    const buf = fs.readFileSync(file.fullPath);
    if (isBinaryBuffer(buf)) {
      skippedLargeOrBinary++;
      continue;
    }

    const ext = path.extname(file.relPath).replace(".", "") || "text";
    const content = buf.toString("utf8");
    sections.push("");
    sections.push(`--- FILE: ${file.relPath} ---`);
    sections.push("```" + ext);
    sections.push(content.replace(CRLF_REGEX, NL).trimEnd());
    sections.push("```");
    includedCount++;
  }

  const finalOutput = sections.join(NL) + NL;
  const outPath = path.join(ROOT_DIR, OUTPUT_FILE);
  fs.writeFileSync(outPath, finalOutput, "utf8");

  console.log(`Exported ${includedCount} source files + folder tree to: ${outPath}`);
  if (skippedLargeOrBinary > 0) {
    console.log(`Skipped ${skippedLargeOrBinary} binary or large (>300 KB) files.`);
  }

  if (copyToClipboard) {
    try {
      const cmd =
        process.platform === "win32"
          ? "clip"
          : process.platform === "darwin"
          ? "pbcopy"
          : "xclip -selection clipboard";
      execSync(cmd, { input: finalOutput });
      console.log("Copied full project structure and code to clipboard.");
    } catch (err) {
      console.warn("Could not copy to clipboard automatically:", err.message);
    }
  }
}

function copyCleanProject(destArg) {
  if (!destArg) {
    console.error("Usage: node pack-project.js --copy <destination-folder>");
    process.exit(1);
  }
  const destDir = path.resolve(ROOT_DIR, destArg);
  if (destDir === ROOT_DIR || destDir.startsWith(ROOT_DIR + path.sep)) {
    console.error("Destination folder must be outside the current project directory.");
    process.exit(1);
  }

  fs.cpSync(ROOT_DIR, destDir, {
    recursive: true,
    filter: (src) => {
      if (src === ROOT_DIR) return true;
      const base = path.basename(src);
      if (base === SCRIPT_NAME || base === OUTPUT_FILE) return false;
      const isDir = fs.statSync(src).isDirectory();
      return !shouldIgnoreEntry(base, isDir, "copy");
    },
  });

  console.log(`Copied clean project (without node_modules, .git, build/cache junk) to:${NL}  ${destDir}`);
}

function cleanUnnecessaryFiles(dryRun = false) {
  let removedCount = 0;

  function walkAndClean(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (CLEAN_DIR_TARGETS.has(entry.name)) {
          console.log(`${dryRun ? "[DRY-RUN] Would remove dir:" : "Removed dir:"} ${path.relative(ROOT_DIR, fullPath)}`);
          if (!dryRun) fs.rmSync(fullPath, { recursive: true, force: true });
          removedCount++;
        } else {
          walkAndClean(fullPath);
        }
      } else {
        if (
          CLEAN_FILE_TARGETS.has(entry.name) ||
          entry.name.endsWith(".tmp") ||
          entry.name.endsWith(".bak")
        ) {
          console.log(`${dryRun ? "[DRY-RUN] Would remove file:" : "Removed file:"} ${path.relative(ROOT_DIR, fullPath)}`);
          if (!dryRun) fs.rmSync(fullPath, { force: true });
          removedCount++;
        }
      }
    }
  }

  walkAndClean(ROOT_DIR);
  console.log(
    removedCount === 0
      ? "Project is already clean—no unnecessary build/cache files found."
      : `${dryRun ? "Found" : "Removed"} ${removedCount} unnecessary items.`
  );
}

// CLI Router
const args = process.argv.slice(2);
if (args.includes("--copy")) {
  const idx = args.indexOf("--copy");
  copyCleanProject(args[idx + 1]);
} else if (args.includes("--clean")) {
  cleanUnnecessaryFiles(args.includes("--dry-run"));
} else {
  exportBundle(args.includes("--clip"));
}
