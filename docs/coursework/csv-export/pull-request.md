## Summary

Closes #1.

- Add `Als CSV herunterladen` beside the existing Excel export on practice results.
- Export one row per saved attempt, including repeated and incomplete attempts.
- Use UTF-8 BOM, comma separators, CRLF records and quoted/escaped special characters.
- Export a valid header-only file for empty results and prefix formula-like text with an apostrophe.
- Keep the existing authenticated results API and XLSX export unchanged.
- Allow the results action buttons to wrap on narrow screens.

## Project And Workflow

[GitHub Projects plan](https://github.com/users/LyoshaGodX/projects/1): seven stages, initial estimate 6 hours.

GitHub Flow: `main` -> `feature/practice-results-csv` -> this pull request -> `main` in the personal coursework fork. No upstream changes or upstream pull request.

The feature issue and plan were created before implementation. Commit `ada2981` preserves the proposal, fixtures, plan and before screenshot.

## Verification

- `node --test webui/tests/CsvExport.test.js`: 18/18 passing.
- Actual UI downloads: NORM (3 attempts), EMPT (header only), SPEC (5 attempts with Cyrillic, commas, quotes, newline and formula-like name).
- `node docs/coursework/csv-export/scripts/verify-downloads.cjs`: all CSV files and existing XLSX download readable by SheetJS; byte hashes recorded.
- Desktop 1440x900 and mobile 390x844 checked; no horizontal overflow at the mobile breakpoint.
- `bun run build` in `webui`: passed with existing CSS, bundle-size and browser-data warnings.
- Scoped ESLint syntax/rules check on the changed JS/JSX and tests: passed.
- Full `bun run lint`: **blocked by the repository's existing legacy `.eslintrc.cjs` with ESLint 10**, also observed before implementation. This PR does not migrate unrelated lint configuration.

Evidence, screenshots, synthetic fixtures and sample downloads are under `docs/coursework/csv-export/`. No real learner data or authentication tokens are included.

## Review Notes

Local self-review verified escaping, zero/fractional scores, percentages, attempt preservation, download cleanup, error reporting and unchanged backend/Excel behavior. No independent human review or CI approval is claimed.

CSV spreadsheet interpretation depends on the importer. Formula-like text receives an explicit apostrophe; automated ETL should account for that prefix. UTF-8 and comma delimiter may need to be selected explicitly in localized spreadsheet import dialogs.
