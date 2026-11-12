import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mmSsToSeconds,
  secondsToMmSs,
  extractTimestampsFromLlm,
  formatTimestampSrt,
  calculate9x16Crop,
  buildSrtFromWords,
} from './pipelineLogic.ts';

test('mmSsToSeconds converts MM:SS accurately', () => {
  assert.equal(mmSsToSeconds('00:45'), 45);
  assert.equal(mmSsToSeconds('01:15'), 75);
  assert.equal(mmSsToSeconds('02:30.5'), 150.5);
  assert.equal(mmSsToSeconds('01:00:00'), 3600);
});

test('secondsToMmSs formats seconds to zero-padded MM:SS', () => {
  assert.equal(secondsToMmSs(45), '00:45');
  assert.equal(secondsToMmSs(75), '01:15');
  assert.equal(secondsToMmSs(125), '02:05');
});

test('extractTimestampsFromLlm parses strict [START: MM:SS, END: MM:SS]', () => {
  const llmOutput = '[START: 01:15, END: 02:10]';
  const res = extractTimestampsFromLlm(llmOutput);
  assert.ok(res !== null);
  assert.equal(res.startStr, '01:15');
  assert.equal(res.endStr, '02:10');
  assert.equal(res.startSec, 75);
  assert.equal(res.endSec, 130);
  assert.equal(res.duration, 55);
});

test('extractTimestampsFromLlm handles conversational wrappers gracefully', () => {
  const wrapped = 'Based on the transcript, here is the clip: [START: 00:30, END: 01:25]';
  const res = extractTimestampsFromLlm(wrapped);
  assert.ok(res !== null);
  assert.equal(res.startSec, 30);
  assert.equal(res.endSec, 85);
  assert.equal(res.duration, 55);
});

test('formatTimestampSrt returns proper SRT comma-millisecond timecode', () => {
  assert.equal(formatTimestampSrt(0), '00:00:00,000');
  assert.equal(formatTimestampSrt(75.5), '00:01:15,500');
  assert.equal(formatTimestampSrt(3665.123), '01:01:05,123');
});

test('calculate9x16Crop produces exact 9:16 aspect ratio centered crop', () => {
  // 1920x1080 standard 16:9 HD video
  const crop = calculate9x16Crop(1920, 1080);
  assert.equal(crop.cropHeight, 1080);
  // 1080 * 9 / 16 = 607.5 -> 607
  assert.equal(crop.cropWidth, 607);
  // Centered offsetX: (1920 - 607) / 2 = 656.5 -> 656
  assert.equal(crop.offsetX, 656);
  assert.equal(crop.filterString, 'crop=ih*9/16:ih');
});

test('buildSrtFromWords creates zero-offset synchronized SRT entries', () => {
  const words = [
    { word: 'Welcome', start: 60.0, end: 60.5 },
    { word: 'to', start: 60.6, end: 60.8 },
    { word: 'the', start: 60.9, end: 61.1 },
    { word: 'future', start: 61.2, end: 61.8 },
  ];
  // Clip starts at 60.0, ends at 115.0
  const srt = buildSrtFromWords(words, 60.0, 115.0, 4);
  assert.ok(srt.includes('1'));
  assert.ok(srt.includes('00:00:00,000 --> 00:00:01,800'));
  assert.ok(srt.includes('Welcome to the future'));
});
