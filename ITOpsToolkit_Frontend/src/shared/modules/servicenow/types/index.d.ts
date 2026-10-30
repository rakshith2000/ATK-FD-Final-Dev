export interface SnowFieldWithValueAndDisplayText {
    display_value: string | null;
    value: string | null;
}

export interface SnowFieldWithReferenceLink extends SnowFieldWithValueAndDisplayText {
    link?: string;
}
