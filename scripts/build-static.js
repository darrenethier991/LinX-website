// Assembles the marketing site into dist/ for Cloudflare Pages.
// The admin dashboard (admin/) is a separate deploy target — see DEPLOY.md.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
  'contact.html',
  'contractor-profile.html',
  'find-contractors.html',
  'post-job.html',
  'pricing.html',
  'robots.txt',
  '_headers',
];

const DIRS = ['css', 'js'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const file of FILES) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) copyRecursive(src, path.join(DIST, file));
}
for (const dir of DIRS) {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) copyRecursive(src, path.join(DIST, dir));
}

console.log('Built marketing site into dist/ (admin/ excluded — deploy separately)');
