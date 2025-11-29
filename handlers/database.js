import fs from "fs/promises";
import path from "path";
import { validateProjectPath } from "../utils/validation.js";
import { Errors } from "../utils/errors.js";

export async function addActor(args) {
    const { projectPath, name, classId = 1, initialLevel = 1, maxLevel = 99 } = args;
    await validateProjectPath(projectPath);

    const filePath = path.join(projectPath, "data", "Actors.json");
    let actors = [];
    try {
        actors = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch (e) {
        if (e.code === 'ENOENT') {
            actors = [null];
        } else {
            throw Errors.dataFileReadError('Actors.json', e.message);
        }
    }

    const newId = actors.length;
    const newActor = {
        id: newId,
        name: name,
        classId: classId,
        level: initialLevel,
        characterName: "",
        characterIndex: 0,
        faceName: "",
        faceIndex: 0,
        traits: [],
        initialLevel: initialLevel,
        maxLevel: maxLevel,
        nickname: "",
        note: "",
        profile: ""
    };

    actors.push(newActor);
    await fs.writeFile(filePath, JSON.stringify(actors, null, 2), "utf-8");

    return {
        content: [{ type: "text", text: `Successfully added actor "${name}" (ID: ${newId}).` }],
    };
}

export async function addItem(args) {
    const { projectPath, name, price = 0, consumable = true, scope = 7, occasion = 0 } = args;
    await validateProjectPath(projectPath);

    const filePath = path.join(projectPath, "data", "Items.json");
    let items = [];
    try {
        items = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch (e) {
        if (e.code === 'ENOENT') {
            items = [null];
        } else {
            throw Errors.dataFileReadError('Items.json', e.message);
        }
    }

    const newId = items.length;
    const newItem = {
        id: newId,
        name: name,
        iconIndex: 0,
        description: "",
        price: price,
        consumable: consumable,
        scope: scope,
        occasion: occasion,
        speed: 0,
        successRate: 100,
        repeats: 1,
        tpGain: 0,
        hitType: 0,
        animationId: 0,
        damage: { type: 0, elementId: 0, formula: "0", variance: 20 },
        effects: [],
        note: ""
    };

    items.push(newItem);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");

    return {
        content: [{ type: "text", text: `Successfully added item "${name}" (ID: ${newId}).` }],
    };
}

export async function addSkill(args) {
    const { projectPath, name, mpCost = 0, tpCost = 0, scope = 1, occasion = 1 } = args;
    await validateProjectPath(projectPath);

    const filePath = path.join(projectPath, "data", "Skills.json");
    let skills = [];
    try {
        skills = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch (e) {
        if (e.code === 'ENOENT') {
            skills = [null];
        } else {
            throw Errors.dataFileReadError('Skills.json', e.message);
        }
    }

    const newId = skills.length;
    const newSkill = {
        id: newId,
        name: name,
        iconIndex: 0,
        description: "",
        mpCost: mpCost,
        tpCost: tpCost,
        scope: scope,
        occasion: occasion,
        speed: 0,
        successRate: 100,
        repeats: 1,
        tpGain: 0,
        hitType: 1,
        animationId: 0,
        damage: { type: 1, elementId: 0, formula: "0", variance: 20 },
        effects: [],
        note: "",
        message1: "",
        message2: "",
        requiredWtypeId1: 0,
        requiredWtypeId2: 0,
        stypeId: 1
    };

    skills.push(newSkill);
    await fs.writeFile(filePath, JSON.stringify(skills, null, 2), "utf-8");

    return {
        content: [{ type: "text", text: `Successfully added skill "${name}" (ID: ${newId}).` }],
    };
}
