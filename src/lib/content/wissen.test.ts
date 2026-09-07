import { describe, expect, it } from 'vitest'
import { FOODS, FOOD_GROUPS, FOOD_RULES, FOOD_VERDICTS, foodsByGroup, searchFoods } from './foods'
import {
  NUTRIENTS,
  TRIMESTERS,
  TRIMESTER_FOCUS,
  focusFor,
  nutrientsFor,
  trimesterForWeek,
} from './nutrition'
import { PREP_EXERCISES, PREP_TASKS, prepExercisesFor, prepTasksFor } from './birth-prep'
import { ADMIN_TASKS, adminSections, adminTasksFor } from './austria'
import { BF_BASICS, BF_PROBLEMS, MILK_STORAGE } from './breastfeeding'
import { PP_BODY, PP_MOOD, PP_PHASES, PP_RED_FLAGS } from './postpartum'
import { RECIPES, RECIPE_TAGS, recipesByTag, stockRecipes } from './recipes'

function uniqueKeys(entries: { key: string }[]): boolean {
  return new Set(entries.map((entry) => entry.key)).size === entries.length
}

describe('Lebensmittel-Check', () => {
  it('hat eindeutige Schlüssel und gültige Gruppen', () => {
    expect(uniqueKeys(FOODS)).toBe(true)
    for (const food of FOODS) {
      expect(FOOD_GROUPS).toContain(food.group)
      expect(FOOD_VERDICTS).toContain(food.verdict)
      expect(food.why.length).toBeGreaterThan(20)
    }
  })

  it('deckt jede Gruppe ab', () => {
    for (const group of FOOD_GROUPS) {
      expect(foodsByGroup(group).length).toBeGreaterThan(0)
    }
  })

  it('findet die Klassiker, nach denen man sucht', () => {
    expect(searchFoods('sushi')[0]?.verdict).toBe('avoid')
    expect(searchFoods('kaffee')[0]?.verdict).toBe('care')
    expect(searchFoods('hartkäse')[0]?.verdict).toBe('ok')
  })

  it('findet auch über Synonyme', () => {
    expect(searchFoods('parmesan')[0]?.key).toBe('hartkaese')
    expect(searchFoods('tiramisu')[0]?.key).toBe('rohes-ei')
    expect(searchFoods('prosciutto')[0]?.key).toBe('rohschinken')
    expect(searchFoods('tomate')[0]?.key).toBe('obst-gemuese')
  })

  it('sucht erst ab zwei Zeichen und liefert sonst nichts', () => {
    expect(searchFoods('')).toEqual([])
    expect(searchFoods('a')).toEqual([])
    expect(searchFoods('   ')).toEqual([])
  })

  it('gibt bei unbekannten Begriffen eine leere Liste statt falscher Sicherheit', () => {
    expect(searchFoods('gibtesnicht')).toEqual([])
  })

  it('erklärt bei „kommt darauf an“ immer, worauf', () => {
    for (const food of FOODS.filter((entry) => entry.verdict === 'care')) {
      expect(food.how, `${food.name} ohne Hinweis`).toBeTruthy()
    }
  })

  it('nennt die Hygiene-Grundregeln', () => {
    expect(FOOD_RULES.length).toBeGreaterThanOrEqual(4)
    expect(FOOD_RULES.some((rule) => /Katzenklo/i.test(rule.title + rule.text))).toBe(true)
  })
})

describe('Ernährung nach Trimester', () => {
  it('hat für jedes Trimester einen Fokus und mehrere Nährstoffe', () => {
    for (const trimester of TRIMESTERS) {
      expect(focusFor(trimester).trimester).toBe(trimester)
      expect(nutrientsFor(trimester).length).toBeGreaterThanOrEqual(3)
    }
    expect(TRIMESTER_FOCUS).toHaveLength(3)
  })

  it('ordnet Folsäure dem ersten Trimester zu', () => {
    expect(nutrientsFor(1).map((n) => n.key)).toContain('folsaeure')
    expect(nutrientsFor(3).map((n) => n.key)).not.toContain('folsaeure')
  })

  it('nennt bei jedem Nährstoff konkrete Lebensmittel', () => {
    expect(uniqueKeys(NUTRIENTS)).toBe(true)
    for (const nutrient of NUTRIENTS) {
      expect(nutrient.foods.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('rechnet die Woche in das richtige Trimester um', () => {
    expect(trimesterForWeek(1)).toBe(1)
    expect(trimesterForWeek(13)).toBe(1)
    expect(trimesterForWeek(14)).toBe(2)
    expect(trimesterForWeek(27)).toBe(2)
    expect(trimesterForWeek(28)).toBe(3)
    expect(trimesterForWeek(41)).toBe(3)
  })

  it('nennt jede Trimester-Beschwerde mit einer Hilfe', () => {
    for (const focus of TRIMESTER_FOCUS) {
      expect(focus.trouble.length).toBeGreaterThanOrEqual(2)
      for (const entry of focus.trouble) expect(entry.help.length).toBeGreaterThan(20)
    }
  })
})

describe('Geburtsvorbereitung', () => {
  it('hat eindeutige Schlüssel', () => {
    expect(uniqueKeys(PREP_TASKS)).toBe(true)
    expect(uniqueKeys(PREP_EXERCISES)).toBe(true)
  })

  it('zeigt in SSW 36 mehr als in SSW 20', () => {
    expect(prepTasksFor(36).length).toBeGreaterThan(prepTasksFor(20).length)
    expect(prepExercisesFor(36).length).toBeGreaterThanOrEqual(prepExercisesFor(20).length)
  })

  it('gibt jeder Übung Ziel, Material, Schritte und Dauer', () => {
    for (const exercise of PREP_EXERCISES) {
      expect(exercise.goal.length).toBeGreaterThan(10)
      expect(exercise.material.length).toBeGreaterThan(2)
      expect(exercise.steps.length).toBeGreaterThanOrEqual(3)
      expect(exercise.steps.length).toBeLessThanOrEqual(5)
      expect(exercise.durationLabel).toMatch(/Minute/)
    }
  })

  it('weist bei der tiefen Hocke auf die Rücksprache hin', () => {
    const squat = PREP_EXERCISES.find((exercise) => exercise.key === 'tiefe-hocke')
    expect(squat?.note).toMatch(/Hebamme/)
    expect(squat?.fromWeek).toBeGreaterThanOrEqual(34)
  })

  it('nennt bei jeder Aufgabe einen Zeitpunkt', () => {
    for (const task of PREP_TASKS) {
      expect(task.timing.length).toBeGreaterThan(5)
      expect(task.fromWeek).toBeGreaterThan(0)
      expect(task.fromWeek).toBeLessThanOrEqual(40)
    }
  })
})

describe('Behördenwege Österreich', () => {
  it('hat Einträge vor und nach der Geburt', () => {
    expect(adminTasksFor('vor').length).toBeGreaterThanOrEqual(6)
    expect(adminTasksFor('nach').length).toBeGreaterThanOrEqual(8)
    expect(uniqueKeys(ADMIN_TASKS)).toBe(true)
  })

  it('nennt bei jedem Eintrag Frist und Stelle', () => {
    for (const task of ADMIN_TASKS) {
      expect(task.deadline.length, task.label).toBeGreaterThan(15)
      expect(task.authority.length, task.label).toBeGreaterThanOrEqual(3)
    }
  })

  it('kennt die Fristen, die am häufigsten gerissen werden', () => {
    const byKey = new Map(ADMIN_TASKS.map((task) => [task.key, task]))
    expect(byKey.get('geburtsanzeige')?.deadline).toMatch(/Monat/)
    expect(byKey.get('meldezettel')?.deadline).toMatch(/drei Tagen/)
    expect(byKey.get('kinderbetreuungsgeld')?.deadline).toMatch(/182/)
    expect(byKey.get('papamonat-vorankuendigung')?.deadline).toMatch(/drei Monate/)
  })

  it('markiert die Familienbeihilfe als antragslos', () => {
    expect(ADMIN_TASKS.find((task) => task.key === 'familienbeihilfe')?.automatic).toBe(true)
  })

  it('nennt den Eltern-Kind-Pass beim aktuellen Namen', () => {
    const exam = ADMIN_TASKS.find((task) => task.key === 'ekp-untersuchungen')
    expect(exam?.label).toMatch(/Eltern-Kind-Pass/)
    expect(exam?.note).toMatch(/Mutter-Kind-Pass/)
  })

  it('gruppiert in Abschnitte', () => {
    expect(adminSections('vor').length).toBeGreaterThanOrEqual(3)
    expect(adminSections('nach').length).toBeGreaterThanOrEqual(3)
  })
})

describe('Stillen', () => {
  it('erklärt Grundlagen mit Stichpunkten', () => {
    expect(uniqueKeys(BF_BASICS)).toBe(true)
    expect(BF_BASICS.length).toBeGreaterThanOrEqual(5)
    for (const section of BF_BASICS) expect(section.body.length).toBeGreaterThan(60)
  })

  it('gibt zu jedem Problem Hilfe und sagt, wann es zur Ärztin geht', () => {
    for (const problem of BF_PROBLEMS) {
      expect(problem.help.length).toBeGreaterThanOrEqual(1)
      expect(problem.signs.length).toBeGreaterThan(20)
    }
    const mastitis = BF_PROBLEMS.find((problem) => problem.key === 'mastitis')
    expect(mastitis?.callFor).toMatch(/Ärztin/)
  })

  it('nennt die Aufbewahrungszeiten für abgepumpte Milch', () => {
    const text = MILK_STORAGE.map((entry) => `${entry.place} ${entry.duration}`).join(' ')
    expect(text).toMatch(/4 Stunden/)
    expect(text).toMatch(/4 Tage/)
    expect(text).toMatch(/6 Monate/)
  })
})

describe('Wochenbett', () => {
  it('gliedert die Zeit in Phasen', () => {
    expect(PP_PHASES).toHaveLength(3)
    expect(uniqueKeys([...PP_PHASES, ...PP_BODY, ...PP_MOOD])).toBe(true)
  })

  it('unterscheidet Babyblues und Wochenbettdepression', () => {
    const keys = PP_MOOD.map((entry) => entry.key)
    expect(keys).toContain('babyblues')
    expect(keys).toContain('depression')
  })

  it('führt Warnzeichen konkret auf', () => {
    expect(PP_RED_FLAGS.length).toBeGreaterThanOrEqual(6)
    expect(PP_RED_FLAGS.join(' ')).toMatch(/Fieber/)
    expect(PP_RED_FLAGS.join(' ')).toMatch(/Blutung/)
  })

  it('sagt dem Partner, was konkret hilft', () => {
    const partner = PP_MOOD.find((entry) => entry.key === 'partner')
    expect(partner?.points.length).toBeGreaterThanOrEqual(4)
  })
})

describe('Rezepte', () => {
  it('bleibt bei höchstens 15 Minuten aktiver Zeit', () => {
    expect(uniqueKeys(RECIPES)).toBe(true)
    for (const recipe of RECIPES) {
      expect(recipe.minutes, recipe.title).toBeLessThanOrEqual(15)
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(3)
      expect(recipe.steps.length).toBeGreaterThanOrEqual(2)
      expect(recipe.tags.length).toBeGreaterThanOrEqual(1)
      for (const tag of recipe.tags) expect(RECIPE_TAGS).toContain(tag)
    }
  })

  it('hat genug Vorrat-Rezepte für die erste Woche', () => {
    expect(stockRecipes().length).toBeGreaterThanOrEqual(3)
  })

  it('hat für jedes Schlagwort mindestens ein Rezept', () => {
    for (const tag of RECIPE_TAGS) {
      expect(recipesByTag(tag).length, tag).toBeGreaterThan(0)
    }
  })

  it('bietet genug, was sich mit einer Hand essen lässt', () => {
    expect(recipesByTag('einhändig').length).toBeGreaterThanOrEqual(5)
  })
})
