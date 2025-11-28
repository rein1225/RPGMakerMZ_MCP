import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDialogue, showPicture, addChoice, searchEvents, getEventPage } from './events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testProjectPath = path.join(__dirname, '../test_project');

describe('events', () => {
    describe('addDialogue', () => {
        it('should successfully execute addDialogue', async () => {
            const result = await addDialogue({
                projectPath: testProjectPath,
                mapId: 1,
                eventId: 1,
                pageIndex: 0,
                insertPosition: -1,
                text: 'テスト用会話'
            });

            expect(result.content[0].text).toContain('Added dialogue');
        });

        it('should throw error for invalid map ID', async () => {
            await expect(addDialogue({
                projectPath: testProjectPath,
                mapId: 9999,
                eventId: 1,
                pageIndex: 0,
                insertPosition: -1,
                text: 'Test'
            })).rejects.toThrow();
        });
    });

    describe('showPicture', () => {
        it('should add show picture command with pictureName parameter', async () => {
            const result = await showPicture({
                projectPath: testProjectPath,
                mapId: 1,
                eventId: 1,
                pageIndex: 0,
                insertPosition: -1,
                pictureId: 1,
                pictureName: 'TestPicture',
                x: 100,
                y: 200
            });

            expect(result.content[0].text).toContain('TestPicture');
            expect(result.content[0].text).toContain('ID: 1');
        });
    });

    describe('addChoice', () => {
        it('should successfully execute addChoice', async () => {
            const result = await addChoice({
                projectPath: testProjectPath,
                mapId: 1,
                eventId: 1,
                pageIndex: 0,
                insertPosition: -1,
                options: ['テスト1', 'テスト2']
            });

            expect(result.content[0].text).toContain('Added choice');
        });
    });

    describe('searchEvents', () => {
        it('should find text in map events', async () => {
            const result = await searchEvents({
                projectPath: testProjectPath,
                query: 'Test'
            });

            expect(result.content[0].text).toBeDefined();
            const matches = JSON.parse(result.content[0].text);
            expect(Array.isArray(matches)).toBe(true);
        });
    });

    describe('getEventPage', () => {
        it('should get event page commands', async () => {
            const result = await getEventPage({
                projectPath: testProjectPath,
                mapId: 1,
                eventId: 1,
                pageIndex: 0
            });

            expect(result.content[0].text).toBeDefined();
            expect(result.content[0].text.length).toBeGreaterThan(0);
        });

        it('should throw error for invalid event ID', async () => {
            await expect(getEventPage({
                projectPath: testProjectPath,
                mapId: 1,
                eventId: 9999,
                pageIndex: 0
            })).rejects.toThrow();
        });
    });
});
