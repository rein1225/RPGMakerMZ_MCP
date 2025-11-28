import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { addActor, addItem, addSkill } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testProjectPath = path.join(__dirname, '../test_project');

describe('database', () => {
  describe('addActor', () => {
    let actorsPath;
    let originalActors;

    beforeEach(async () => {
      actorsPath = path.join(testProjectPath, 'data', 'Actors.json');
      const content = await fs.readFile(actorsPath, 'utf-8');
      originalActors = content;
    });

    it('should add a new actor with required parameters', async () => {
      const result = await addActor({
        projectPath: testProjectPath,
        name: 'テストヒーロー'
      });

      expect(result.content[0].text).toContain('テストヒーロー');
      expect(result.content[0].text).toMatch(/ID: \d+/);

      // Verify the actor was actually added
      const actors = JSON.parse(await fs.readFile(actorsPath, 'utf-8'));
      const newActor = actors.find(a => a && a.name === 'テストヒーロー');
      expect(newActor).toBeDefined();
      expect(newActor.classId).toBe(1); // default
      expect(newActor.initialLevel).toBe(1); // default
      expect(newActor.maxLevel).toBe(99); // default

      // Restore original
      await fs.writeFile(actorsPath, originalActors, 'utf-8');
    });

    it('should add actor with custom parameters', async () => {
      const result = await addActor({
        projectPath: testProjectPath,
        name: 'カスタムヒーロー',
        classId: 2,
        initialLevel: 5,
        maxLevel: 50
      });

      const actors = JSON.parse(await fs.readFile(actorsPath, 'utf-8'));
      const newActor = actors.find(a => a && a.name === 'カスタムヒーロー');
      expect(newActor.classId).toBe(2);
      expect(newActor.initialLevel).toBe(5);
      expect(newActor.maxLevel).toBe(50);

      // Restore original
      await fs.writeFile(actorsPath, originalActors, 'utf-8');
    });

    it('should throw error for invalid project path', async () => {
      await expect(addActor({
        projectPath: '/invalid/path',
        name: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('addItem', () => {
    let itemsPath;
    let originalItems;

    beforeEach(async () => {
      itemsPath = path.join(testProjectPath, 'data', 'Items.json');
      const content = await fs.readFile(itemsPath, 'utf-8');
      originalItems = content;
    });

    it('should add a new item with default parameters', async () => {
      const result = await addItem({
        projectPath: testProjectPath,
        name: 'テストポーション'
      });

      expect(result.content[0].text).toContain('テストポーション');

      const items = JSON.parse(await fs.readFile(itemsPath, 'utf-8'));
      const newItem = items.find(i => i && i.name === 'テストポーション');
      expect(newItem).toBeDefined();
      expect(newItem.price).toBe(0);
      expect(newItem.consumable).toBe(true);

      // Restore original
      await fs.writeFile(itemsPath, originalItems, 'utf-8');
    });

    it('should add item with custom price and consumable flag', async () => {
      const result = await addItem({
        projectPath: testProjectPath,
        name: 'エリクサー',
        price: 500,
        consumable: false
      });

      const items = JSON.parse(await fs.readFile(itemsPath, 'utf-8'));
      const newItem = items.find(i => i && i.name === 'エリクサー');
      expect(newItem.price).toBe(500);
      expect(newItem.consumable).toBe(false);

      // Restore original
      await fs.writeFile(itemsPath, originalItems, 'utf-8');
    });
  });

  describe('addSkill', () => {
    let skillsPath;
    let originalSkills;

    beforeEach(async () => {
      skillsPath = path.join(testProjectPath, 'data', 'Skills.json');
      const content = await fs.readFile(skillsPath, 'utf-8');
      originalSkills = content;
    });

    it('should add a new skill with default parameters', async () => {
      const result = await addSkill({
        projectPath: testProjectPath,
        name: 'ファイア'
      });

      expect(result.content[0].text).toContain('ファイア');

      const skills = JSON.parse(await fs.readFile(skillsPath, 'utf-8'));
      const newSkill = skills.find(s => s && s.name === 'ファイア');
      expect(newSkill).toBeDefined();
      expect(newSkill.mpCost).toBe(0);
      expect(newSkill.tpCost).toBe(0);

      // Restore original
      await fs.writeFile(skillsPath, originalSkills, 'utf-8');
    });

    it('should add skill with custom MP and TP cost', async () => {
      const result = await addSkill({
        projectPath: testProjectPath,
        name: 'メガフレア',
        mpCost: 50,
        tpCost: 30
      });

      const skills = JSON.parse(await fs.readFile(skillsPath, 'utf-8'));
      const newSkill = skills.find(s => s && s.name === 'メガフレア');
      expect(newSkill.mpCost).toBe(50);
      expect(newSkill.tpCost).toBe(30);

      // Restore original
      await fs.writeFile(skillsPath, originalSkills, 'utf-8');
    });
  });
});
