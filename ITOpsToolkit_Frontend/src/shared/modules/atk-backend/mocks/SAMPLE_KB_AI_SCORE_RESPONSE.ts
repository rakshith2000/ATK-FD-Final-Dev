import type { KBArticleScoringResponse } from '../types/knowledge-base';

const SAMPLE_KB_AI_SCORE_RESPONSE: KBArticleScoringResponse = {
    score_details: {
        human_readability: {
            score: 3,
            justification:
                'The article is moderately clear and structured, with logical steps and concise instructions. However, it lacks detailed explanations for certain steps, such as why specific configurations are recommended. Headings are present but could be more descriptive, and the content is somewhat terse, reducing overall readability.',
        },
        AI_readability: {
            score: 3,
            justification:
                "The article uses consistent terminology and short sentences, making it suitable for machine interpretation. However, it lacks metadata or structured formatting that would enhance retrieval and knowledge extraction. Some steps are ambiguous, such as 'monitor tasks,' which could hinder semantic clarity.",
        },
        professionalism: {
            score: 3,
            justification:
                'The tone is professional, and the grammar is accurate. However, the article lacks depth in technical explanations and examples, reducing its completeness. Formatting is consistent but minimal, and troubleshooting steps are brief, limiting their effectiveness for complex issues.',
        },
    },
    average_score: 3,
};

export default SAMPLE_KB_AI_SCORE_RESPONSE;
