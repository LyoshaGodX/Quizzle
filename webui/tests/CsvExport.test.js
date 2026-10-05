import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import XLSX from 'xlsx';
import {createPracticeResultsCsv, exportPracticeResultsToCsv} from '../src/common/utils/CsvExport.js';

const headers = ['Practice code', 'Name', 'Score', 'Total', 'Percentage', 'Timestamp'];
const fixtures = JSON.parse(readFileSync(new URL('../../docs/coursework/csv-export/fixtures/attempts.json', import.meta.url), 'utf8'));
const makeResults = (attempts, total = 3) => ({
    quiz: {questions: Array.from({length: total}, () => ({}))},
    results: attempts.map((attempt) => ({...attempt, timestamp: fixtures.timestamp}))
});
const parse = (csv) => {
    const workbook = XLSX.read(Buffer.from(csv, 'utf8'), {type: 'buffer', raw: true});
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, raw: true, defval: ''});
};

test('ordinary results include every attempt, zero scores and rounded percentages', () => {
    const data = makeResults(fixtures.datasets[0].attempts);
    const csv = createPracticeResultsCsv(data, 'NORM');
    assert.deepEqual(parse(csv), [headers,
        ['NORM', 'Ivan Petrov', '2', '3', '66.67', fixtures.timestamp],
        ['NORM', 'Anna Smirnova', '0', '3', '0', fixtures.timestamp],
        ['NORM', 'Ivan Petrov', '3', '3', '100', fixtures.timestamp]
    ]);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.endsWith('\r\n'));
    assert.equal(csv.replace(/\r\n/g, '').includes('\n'), false);
});

test('empty results produce only the header, with BOM and CRLF', () => {
    assert.equal(createPracticeResultsCsv(makeResults([]), 'EMPT'), '\uFEFF' + headers.join(',') + '\r\n');
    assert.deepEqual(parse(createPracticeResultsCsv(null, 'EMPT')), [headers]);
});

test('Cyrillic, commas, quotes and embedded newlines round-trip with an independent parser', () => {
    const attempts = fixtures.datasets[2].attempts;
    const csv = createPracticeResultsCsv(makeResults(attempts), 'SPEC');
    const rows = parse(csv);
    assert.deepEqual(rows.slice(1).map((row) => row[1]), attempts.map((attempt) =>
        attempt.name === '=1+1' ? "'=1+1" : attempt.name));
    assert.ok(csv.includes('"Смирнова, Анна"'));
    assert.ok(csv.includes('"Олег ""Тест"""'));
    assert.ok(csv.includes('"Мария\nСтажёр"'));
    assert.equal(rows[3][2], '1.5');
    assert.equal(rows[3][4], '50');
});

test('CRLF and lone CR inside names are quoted without losing characters', () => {
    for (const name of ['First\r\nSecond', 'First\rSecond']) {
        const csv = createPracticeResultsCsv(makeResults([{name, score: 1}]), 'TEST');
        assert.ok(csv.includes(`"${name}"`));
        // SheetJS normalizes CRLF inside cells to LF when importing CSV.
        assert.equal(parse(csv)[1][1], name.replace(/\r\n/g, '\n'));
    }
});

test('partial attempts use the full quiz question count and inputs are not mutated', () => {
    const data = makeResults([{name: 'Partial', score: 0.5, total: 1, answers: [{}]}]);
    const original = structuredClone(data);
    assert.deepEqual(parse(createPracticeResultsCsv(data, 'TEST'))[1].slice(2, 5), ['0.5', '3', '16.67']);
    assert.deepEqual(data, original);
});

test('zero total does not export NaN or Infinity', () => {
    assert.equal(parse(createPracticeResultsCsv(makeResults([{name: 'Zero', score: 0}], 0), 'TEST'))[1][4], '0');
});

test('missing optional fields remain empty and missing score defaults to zero', () => {
    assert.deepEqual(parse(createPracticeResultsCsv({results: [{}]}, 'TEST'))[1], ['TEST', '', '0', '0', '0', '']);
});

for (const name of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\tvalue', '\rvalue', '\nvalue']) {
    test(`formula-like name ${JSON.stringify(name)} is exported as text`, () => {
        assert.equal(parse(createPracticeResultsCsv(makeResults([{name, score: 0}]), 'TEST'))[1][1], `'${name}`);
    });
}

const mockDownload = (t, fail = false) => {
    const events = [];
    let downloadedBlob;
    let cleanup;
    const link = {click() { events.push('click'); if (fail) throw new Error('download failed'); }, remove() { events.push('remove'); }};
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {createElement: () => link, body: {appendChild: () => events.push('append')}}
    });
    t.after(() => {
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
        else delete globalThis.document;
    });
    t.mock.method(URL, 'createObjectURL', (blob) => { downloadedBlob = blob; return 'blob:test'; });
    t.mock.method(URL, 'revokeObjectURL', (url) => events.push(`revoke:${url}`));
    t.mock.method(globalThis, 'setTimeout', (callback) => { cleanup = callback; });
    return {events, link, blob: () => downloadedBlob, cleanup: () => cleanup()};
};

test('download has expected filename, MIME type, BOM bytes and cleans up after click', async (t) => {
    const download = mockDownload(t);
    const filename = exportPracticeResultsToCsv(makeResults([]), 'NORM');
    assert.match(filename, /^practice-results_NORM_\d{4}-\d{2}-\d{2}\.csv$/);
    assert.equal(download.link.download, filename);
    assert.equal(download.link.href, 'blob:test');
    assert.equal(download.link.hidden, true);
    assert.equal(download.blob().type, 'text/csv;charset=utf-8');
    assert.deepEqual([...new Uint8Array(await download.blob().arrayBuffer()).slice(0, 3)], [239, 187, 191]);
    assert.deepEqual(download.events, ['append', 'click', 'remove']);
    download.cleanup();
    assert.deepEqual(download.events, ['append', 'click', 'remove', 'revoke:blob:test']);
});

test('download cleans up even if clicking fails', (t) => {
    const download = mockDownload(t, true);
    assert.throws(() => exportPracticeResultsToCsv(makeResults([]), 'TEST'), /download failed/);
    assert.deepEqual(download.events, ['append', 'click', 'remove']);
    download.cleanup();
    assert.equal(download.events.at(-1), 'revoke:blob:test');
});

test('download filename cannot contain path separators', (t) => {
    mockDownload(t);
    assert.match(exportPracticeResultsToCsv(makeResults([]), '../bad\\code'), /^practice-results____bad_code_/);
});
