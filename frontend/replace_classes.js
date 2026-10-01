import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

const replacements = [
  { regex: /\bocean-/g, replace: 'primary-' },
  { regex: /\bcoral-/g, replace: 'secondary-' },
  { regex: /\bemerald-/g, replace: 'success-' },
  { regex: /\bamber-/g, replace: 'warning-' },
  { regex: /\bred-/g, replace: 'danger-' },
  { regex: /\bbg-dark\b/g, replace: 'bg-sidebar' },
  { regex: /\bbg-dark-[123]00\b/g, replace: 'bg-border' },
  { regex: /\bbg-dark-[456789]00\b/g, replace: 'bg-sidebar' },
  { regex: /\btext-dark\b/g, replace: 'text-text-primary' },
  { regex: /\btext-dark-[123]00\b/g, replace: 'text-border' },
  { regex: /\btext-dark-[456]00\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-dark-[789]00\b/g, replace: 'text-text-primary' },
  { regex: /\bborder-dark(-[0-9]+)?\b/g, replace: 'border-border' },
  { regex: /\bbg-slate-bg\b/g, replace: 'bg-bg-default' },
  { regex: /\bfont-display\b/g, replace: 'font-heading' }
];

walk(srcDir, filePath => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const r of replacements) {
      content = content.replace(r.regex, r.replace);
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
