import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {FFMPEG_TARGET_FORMATS, SAY_NATIVE_EXTS, getMimeType} from '../../src/lib/formats.js';

describe('formats', () => {
    it('recognizes native say extensions', () => {
        assert.ok(SAY_NATIVE_EXTS.has('.aiff'));
        assert.ok(SAY_NATIVE_EXTS.has('.wav'));
        assert.ok(!SAY_NATIVE_EXTS.has('.mp3'));
    });

    it('defines ffmpeg targets with extensions', () => {
        assert.equal(FFMPEG_TARGET_FORMATS.mp3.ext, '.mp3');
        assert.ok(FFMPEG_TARGET_FORMATS.mp3.args.includes('libmp3lame'));
        assert.equal(FFMPEG_TARGET_FORMATS.pcm.ext, '.raw');
    });

    it('maps formats to mime types', () => {
        assert.equal(getMimeType('mp3'), 'audio/mpeg');
        assert.equal(getMimeType('WAV'), 'audio/wav');
        assert.equal(getMimeType('unknown'), 'application/octet-stream');
    });
});
