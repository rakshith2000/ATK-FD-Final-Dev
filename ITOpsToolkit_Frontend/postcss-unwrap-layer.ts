import type { Plugin } from 'postcss';

/**
 * PostCSS plugin that unwraps all @layer rules, promoting their contents
 * to the top level. This ensures MFE styles are "unlayered" and win over
 * the host's unlayered CSS (when combined with #itops-mfe-root prefix for specificity).
 */
const unwrapLayer = (): Plugin => {
    return {
        postcssPlugin: 'postcss-unwrap-layer',
        AtRule: {
            layer: (atRule) => {
                atRule.replaceWith(atRule.nodes ?? []);
            },
        },
    };
};

unwrapLayer.postcss = true as const;

export default unwrapLayer;
