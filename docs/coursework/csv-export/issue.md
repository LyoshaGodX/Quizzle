# Add CSV export for practice quiz results

## Problem

The practice results page already exports analytics to Excel, but it does not provide a simple CSV of individual attempts. A teacher or corporate trainer needs to combine quiz attempts with a course progress register without processing a multi-sheet workbook.

## User Story

As a teacher or corporate trainer, I want to download practice quiz attempts as a CSV file so that I can compare learning results and import them into a spreadsheet or reporting tool.

## Scenario

1. An authenticated teacher opens `/results/:code` after learners submit practice quiz answers.
2. The teacher selects **Als CSV herunterladen** beside the existing Excel export.
3. The browser downloads a `.csv` file containing all saved attempts for that practice code.
4. The teacher imports the file with comma as the delimiter and UTF-8 encoding. Cyrillic names and names containing commas, quotes or newlines remain intact.

## Proposed Format

- One row per saved attempt, including repeated and incomplete attempts.
- Columns: `Practice code`, `Name`, `Score`, `Total`, `Percentage`, `Timestamp`.
- `Total` is the total number of quiz questions. `Timestamp` is the last answer timestamp supplied by the existing API, in ISO 8601 format.
- `Percentage` is `Score / Total * 100`, rounded to two decimal places; it is zero when `Total` is zero.
- UTF-8 with BOM, comma delimiter, CRLF record separators, doubled double quotes inside quoted fields.
- File name: `practice-results_<CODE>_<YYYY-MM-DD>.csv`.

## Acceptance Criteria

- [ ] The loaded practice results page has an accessible CSV download button with the existing visual style and download icon.
- [ ] A normal dataset exports the header and exactly one row per attempt, with correct scores and percentages, including zero scores and repeated attempts.
- [ ] Cyrillic characters are preserved and the downloaded file begins with the UTF-8 BOM.
- [ ] Commas, double quotes, carriage returns and line feeds in names are escaped correctly and round-trip through an independent CSV parser.
- [ ] An empty dataset downloads a valid header-only CSV without an exception.
- [ ] The browser downloads a `.csv` file with `text/csv;charset=utf-8` content; temporary DOM elements and object URLs are released.
- [ ] Names that could be interpreted as spreadsheet formulas are exported as text.
- [ ] Existing Excel export and access to practice results continue to work.
- [ ] Automated checks and actual browser downloads are recorded, including ordinary, empty and special-character datasets.

## Implementation Scope

Use the already loaded authenticated results response. Add a small CSV utility and a download action to `PracticeResults`. No new API endpoint or database change is needed. Keep German interface wording. Development branch: `feature/practice-results-csv`, using GitHub Flow.

This proposal is implemented in an educational fork of `gnmyt/Quizzle`. All report fixtures are synthetic.
