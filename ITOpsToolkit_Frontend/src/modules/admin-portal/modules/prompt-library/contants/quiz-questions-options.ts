// Module configuration identifiers for the Train AI (train_assist) package.
export const TRAIN_ASSIST_MODULE = 'train_assist';
export const NUMBER_OF_QUESTIONS_PER_QUIZ_PARAMETER = 'NUMBER_OF_QUESTIONS_PER_QUIZ';

// Options for the "Number of questions for quiz" dropdown.
const quizQuestionsOptions: Array<{ label: string; value: string }> = [
    { label: '5', value: '5' },
    { label: '10', value: '10' },
    { label: '15', value: '15' },
    { label: '20', value: '20' },
    { label: '25', value: '25' },
];

export default quizQuestionsOptions;
