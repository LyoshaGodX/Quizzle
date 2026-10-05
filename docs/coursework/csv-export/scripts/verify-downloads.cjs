const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {createRequire} = require('node:module');

const root = path.resolve(__dirname, '../../../..');
const XLSX = createRequire(path.join(root, 'webui/package.json'))('xlsx');
const report = path.resolve(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(report, 'fixtures/attempts.json'), 'utf8'));
const files = fs.readdirSync(path.join(report, 'samples'));
const checks = [];

for (const dataset of fixtures.datasets) {
    const filename = files.find((file) => file.startsWith(`practice-results_${dataset.code}_`) && file.endsWith('.csv'));
    assert.ok(filename, `Missing browser download for ${dataset.code}`);
    const bytes = fs.readFileSync(path.join(report, 'samples', filename));
    assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191]);
    assert.ok(bytes.toString('utf8').endsWith('\r\n'));
    const workbook = XLSX.read(bytes, {type: 'buffer', raw: true});
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, raw: true, defval: ''});
    assert.deepEqual(rows[0], ['Practice code', 'Name', 'Score', 'Total', 'Percentage', 'Timestamp']);
    assert.equal(rows.length - 1, dataset.attempts.length);
    const actual = rows.slice(1).map((row) => ({name: row[1], score: Number(row[2]), total: Number(row[3]), percentage: Number(row[4]), timestamp: row[5]}));
    const expected = dataset.attempts.map((attempt) => ({...attempt,
        name: attempt.name.startsWith('=') ? `'${attempt.name}` : attempt.name,
        percentage: Math.round(attempt.score / attempt.total * 10000) / 100,
        timestamp: fixtures.timestamp
    }));
    const sort = (items) => items.sort((a, b) => a.name.localeCompare(b.name) || a.score - b.score);
    assert.deepEqual(sort(actual), sort(expected));
    assert.ok(rows.slice(1).every((row) => row[0] === dataset.code));
    checks.push({scenario: dataset.scenario, filename, bytes: bytes.length, rows: dataset.attempts.length,
        sha256: createHash('sha256').update(bytes).digest('hex'), passed: true});
}

const excelFile = files.find((file) => file.endsWith('.xlsx'));
assert.ok(excelFile, 'Missing Excel regression download');
const excel = XLSX.readFile(path.join(report, 'samples', excelFile));
assert.ok(excel.SheetNames.length >= 3);
checks.push({scenario: 'existing-excel-export', filename: excelFile, sheets: excel.SheetNames, passed: true});
console.log(JSON.stringify({checkedAt: new Date().toISOString(), source: 'Actual downloads from the local app UI; copied from Downloads unchanged.', checks}, null, 2));
