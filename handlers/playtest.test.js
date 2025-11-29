import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('puppeteer', () => {
  return {
    default: {
      connect: vi.fn()
    }
  };
});

vi.mock('../utils/logger.js', () => ({
  Logger: {
    warn: vi.fn().mockResolvedValue(),
    info: vi.fn().mockResolvedValue(),
    debug: vi.fn().mockResolvedValue(),
    error: vi.fn().mockResolvedValue()
  }
}));

import puppeteer from 'puppeteer';
import { Logger } from '../utils/logger.js';
import { inspectGameState } from './playtest.js';

describe('playtest.inspectGameState', () => {
  const createMockBrowser = (pages) => ({
    pages: vi.fn().mockResolvedValue(pages),
    disconnect: vi.fn().mockResolvedValue()
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates script on the first page and returns result', async () => {
    const mockEvaluate = vi.fn().mockResolvedValue({ switches: [1, 2, 3] });
    const mockPage = { evaluate: mockEvaluate };
    const mockBrowser = createMockBrowser([mockPage]);
    puppeteer.connect.mockResolvedValue(mockBrowser);

    const result = await inspectGameState({
      port: 9333,
      script: 'return $gameSwitches.value(1);'
    });

    expect(Logger.warn).toHaveBeenCalledWith(
      'Executing arbitrary code via inspect_game_state: return $gameSwitches.value(1);'
    );
    expect(puppeteer.connect).toHaveBeenCalledWith({
      browserURL: 'http://127.0.0.1:9333',
      defaultViewport: null
    });
    expect(mockEvaluate).toHaveBeenCalledWith(expect.any(Function), 'return $gameSwitches.value(1);');
    expect(result.content[0].text).toContain('switches');
  });

  it('throws when no pages are available', async () => {
    const mockBrowser = createMockBrowser([]);
    puppeteer.connect.mockResolvedValue(mockBrowser);

    await expect(
      inspectGameState({ port: 9222, script: 'return 1;' })
    ).rejects.toThrow('No pages found in browser');
  });
});

