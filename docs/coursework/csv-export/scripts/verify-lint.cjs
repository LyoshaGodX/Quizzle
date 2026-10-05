const path = require('node:path');
const {createRequire} = require('node:module');

const root = path.resolve(__dirname, '../../../..');
const webui = path.join(root, 'webui');
const requireWebui = createRequire(path.join(webui, 'package.json'));
const {ESLint} = requireWebui('eslint');

async function main() {
    const eslint = new ESLint({
        cwd: webui,
        overrideConfigFile: true,
        overrideConfig: [{
            files: ['**/*.js', '**/*.jsx'],
            languageOptions: {
                globals: {console: 'readonly', document: 'readonly', URL: 'readonly', Blob: 'readonly', setTimeout: 'readonly', Buffer: 'readonly', structuredClone: 'readonly'},
                parserOptions: {ecmaFeatures: {jsx: true}}
            },
            rules: {
                'no-undef': 'error',
                'no-unused-vars': 'error',
                'no-unreachable': 'error',
                'no-dupe-args': 'error',
                'no-dupe-keys': 'error',
                'valid-typeof': 'error'
            }
        }, {
            files: ['src/pages/PracticeResults/PracticeResults.jsx'],
            // Existing JSX imports are consumed by React, not plain JS expressions.
            rules: {'no-unused-vars': 'off'}
        }]
    });
    const files = ['src/common/utils/CsvExport.js', 'tests/CsvExport.test.js', 'src/pages/PracticeResults/PracticeResults.jsx'];
    const results = await eslint.lintFiles(files);
    const formatter = await eslint.loadFormatter('stylish');
    console.log(formatter.format(results) || 'Scoped ESLint checks passed.');
    console.log(JSON.stringify({files, errors: results.reduce((n, r) => n + r.errorCount, 0), warnings: results.reduce((n, r) => n + r.warningCount, 0)}, null, 2));
    if (results.some((result) => result.errorCount || result.warningCount)) process.exitCode = 1;
}

main().catch((error) => {console.error(error); process.exitCode = 1;});
