const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../../../..');
process.chdir(repositoryRoot);

const {firstStart} = require(path.join(repositoryRoot, 'server/utils/file.js'));
const {createUser, isSetupComplete} = require(path.join(repositoryRoot, 'server/utils/auth.js'));
const {compressQuiz} = require(path.join(repositoryRoot, 'server/utils/quiz.js'));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/attempts.json'), 'utf8'));

firstStart();
if (!isSetupComplete()) {
    createUser('coursework', 'CsvPractice2026!', 'admin');
}

const quiz = {
    __type: 'QUIZZLE2',
    title: 'IT project management: practice',
    questions: [
        {title: 'What does a Git commit record?', type: 'single', answers: [
            {content: 'A snapshot of changes', type: 'text', is_correct: true},
            {content: 'Only a project name', type: 'text', is_correct: false}
        ]},
        {title: 'Where is a feature request recorded?', type: 'single', answers: [
            {content: 'In a GitHub issue', type: 'text', is_correct: true},
            {content: 'In a browser bookmark', type: 'text', is_correct: false}
        ]},
        {title: 'What defines feature acceptance?', type: 'single', answers: [
            {content: 'Acceptance criteria', type: 'text', is_correct: true},
            {content: 'The branch name alone', type: 'text', is_correct: false}
        ]}
    ]
};

const now = new Date();
const meta = {
    created: now.toISOString(),
    expiry: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
};

for (const dataset of fixtures.datasets) {
    const quizDirectory = path.join(repositoryRoot, 'data/practice-quizzes', dataset.code);
    if (fs.existsSync(quizDirectory)) {
        throw new Error(`Demo directory already exists: ${dataset.code}. Existing data was preserved.`);
    }
    fs.mkdirSync(path.join(quizDirectory, 'results'), {recursive: true});
    fs.writeFileSync(path.join(quizDirectory, 'quiz.quizzle'), compressQuiz(quiz));
    fs.writeFileSync(path.join(quizDirectory, 'meta.json'), JSON.stringify(meta, null, 2));
    dataset.attempts.forEach((attempt, index) => {
        const answers = quiz.questions.map((_, questionIndex) => {
            const answerScore = Math.max(0, Math.min(1, attempt.score - questionIndex));
            return {
                result: answerScore === 1 ? 'correct' : answerScore > 0 ? 'partial' : 'incorrect',
                userAnswer: answerScore > 0 ? [0] : [1],
                correctAnswer: [0],
                score: answerScore
            };
        });
        const result = {...attempt, character: 'wizard', answers, timestamp: fixtures.timestamp};
        fs.writeFileSync(path.join(quizDirectory, 'results', `coursework-${index + 1}.json`), JSON.stringify(result, null, 2));
    });
    console.log(`${dataset.code}: ${dataset.attempts.length} synthetic attempts (${dataset.scenario})`);
}

console.log('Local demo account: coursework / CsvPractice2026! (synthetic local environment only).');
