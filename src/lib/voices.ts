export type Voice = {
    name: string;
    locale: string;
    description: string;
};

/** Parse `say -v ?` output into structured voice list. */
export function parseVoices(raw: string): Voice[] {
    return raw
        .split('\n')
        .filter(Boolean)
        .map(line => {
            const m = line.match(/^(.+?)\s{2,}(\w+[-_]\w+(?:[-_]\w+)?)\s+#\s+(.+)$/);
            if (!m) return null;
            return {name: m[1].trim(), locale: m[2].trim(), description: m[3].trim()};
        })
        .filter((v): v is Voice => v !== null);
}
