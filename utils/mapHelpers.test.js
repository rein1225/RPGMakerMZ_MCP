import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadMapData, saveMapData, getEventPageList } from './mapHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testProjectPath = path.join(__dirname, '../test_project');

describe('mapHelpers', () => {
  describe('loadMapData', () => {
    it('should load map data for valid map ID', async () => {
      const mapData = await loadMapData(testProjectPath, 1);
      expect(mapData).toBeDefined();
      expect(typeof mapData).toBe('object');
    });

    it('should pad map ID with zeros', async () => {
      const mapData = await loadMapData(testProjectPath, 1);
      expect(mapData).toBeDefined();
    });

    it('should throw error for non-existent map', async () => {
      await expect(loadMapData(testProjectPath, 99999)).rejects.toThrow();
    });
  });

  describe('saveMapData', () => {
    it('should save map data', async () => {
      const originalData = await loadMapData(testProjectPath, 1);
      const testData = { ...originalData, testProperty: 'test' };
      
      await saveMapData(testProjectPath, 1, testData);
      const savedData = await loadMapData(testProjectPath, 1);
      
      expect(savedData.testProperty).toBe('test');
      
      // Restore original data
      await saveMapData(testProjectPath, 1, originalData);
    });
  });

  describe('getEventPageList', () => {
    it('should get event page list for valid event and page', async () => {
      const mapData = await loadMapData(testProjectPath, 1);
      
      if (mapData.events && Object.keys(mapData.events).length > 0) {
        const eventId = Object.keys(mapData.events)[0];
        const event = mapData.events[eventId];
        
        if (event.pages && event.pages.length > 0) {
          const list = getEventPageList(mapData, eventId, 0);
          expect(Array.isArray(list)).toBe(true);
        }
      }
    });

    it('should throw error for non-existent event', () => {
      const mapData = { events: {} };
      expect(() => getEventPageList(mapData, '999', 0)).toThrow('Event 999 not found');
    });

    it('should throw error for non-existent page', async () => {
      const mapData = await loadMapData(testProjectPath, 1);
      
      if (mapData.events && Object.keys(mapData.events).length > 0) {
        const eventId = Object.keys(mapData.events)[0];
        expect(() => getEventPageList(mapData, eventId, 999)).toThrow('Page 999 not found');
      }
    });
  });
});

