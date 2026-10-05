const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const report = path.resolve(__dirname, '..');
const checked = [];

const checkTarget = (document, target) => {
    if (/^(https?:|#)/.test(target)) return;
    const filename = path.resolve(report, target.split('#')[0]);
    assert.ok(fs.existsSync(filename), `Broken local reference in ${document}: ${target}`);
    checked.push({document, target});
};

// These authored artifacts use simple inline Markdown links, without escaped brackets.
for (const document of ['README.md', 'speech.md']) {
    const text = fs.readFileSync(path.join(report, document), 'utf8');
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) checkTarget(document, match[1]);
}

const html = fs.readFileSync(path.join(report, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (match[1].startsWith('#')) {
        assert.ok(html.includes(`id="${match[1].slice(1)}"`), `Broken section link: ${match[1]}`);
    } else checkTarget('index.html', match[1]);
}
assert.ok(html.includes('<html lang="ru">'));
assert.ok(html.includes('name="viewport"'));
const embeddedImages = (fs.readFileSync(path.join(report, 'README.md'), 'utf8').match(/!\[/g) || []).length;
assert.ok(embeddedImages >= 8);
console.log(JSON.stringify({checkedAt: new Date().toISOString(), localReferences: checked.length,
    embeddedReportImages: embeddedImages, passed: true,
    limitation: 'Static local-reference validation only; not a rendered-browser test of index.html.', checked}, null, 2));
