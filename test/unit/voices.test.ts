import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseVoices} from '../../src/lib/voices.js';

describe('parseVoices', () => {
    it('parses standard say -v ? lines', () => {
        const raw = [
            'Tingting                        zh_CN      # 你好，我叫婷婷。',
            'Daniel                          en_GB      # Hello, my name is Daniel.',
            'Kyoko                           ja_JP      # こんにちは、私の名前はきょうこです。'
        ].join('\n');

        const voices = parseVoices(raw);

        assert.equal(voices.length, 3);
        assert.deepEqual(voices[0], {
            name: 'Tingting',
            locale: 'zh_CN',
            description: '你好，我叫婷婷。'
        });
        assert.deepEqual(voices[1], {
            name: 'Daniel',
            locale: 'en_GB',
            description: 'Hello, my name is Daniel.'
        });
    });

    it('filters malformed lines', () => {
        const raw = ['not a voice line', 'Tingting                        zh_CN      # sample'].join('\n');

        const voices = parseVoices(raw);

        assert.equal(voices.length, 1);
        assert.equal(voices[0]?.name, 'Tingting');
    });

    it('returns empty array for empty input', () => {
        assert.deepEqual(parseVoices(''), []);
        assert.deepEqual(parseVoices('\n\n'), []);
    });
});
