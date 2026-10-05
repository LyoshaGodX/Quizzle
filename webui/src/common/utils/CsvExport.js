const CSV_HEADERS = ['Practice code', 'Name', 'Score', 'Total', 'Percentage', 'Timestamp'];

const escapeCsvCell = (value) => {
    let text = String(value ?? '');

    // Keep untrusted names from being interpreted as spreadsheet formulas.
    if (typeof value === 'string' && (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) {
        text = `'${text}`;
    }

    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const createPracticeResultsCsv = (results, practiceCode) => {
    const rows = (results?.results ?? []).map((attempt) => {
        const score = attempt.score ?? 0;
        const total = results?.quiz?.questions?.length ?? attempt.total ?? 0;
        const percentage = total > 0 ? Math.round((score / total) * 10000) / 100 : 0;

        return [practiceCode, attempt.name, score, total, percentage, attempt.timestamp];
    });

    return '\uFEFF' + [CSV_HEADERS, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n') + '\r\n';
};

export const exportPracticeResultsToCsv = (results, practiceCode) => {
    const safeCode = String(practiceCode ?? '').replace(/[^a-z0-9_-]/gi, '_');
    const date = new Date().toISOString().slice(0, 10);
    const filename = `practice-results_${safeCode}_${date}.csv`;
    const blob = new Blob([createPracticeResultsCsv(results, practiceCode)], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    let link;

    try {
        link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
    } finally {
        link?.remove();
        // Let the browser start reading the Blob before releasing its URL.
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    return filename;
};
