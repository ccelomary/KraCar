import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createTranslator, isLocale, resolveLocale } from "../src/i18n/core";
import fr from "../src/i18n/messages/fr.json";
import ar from "../src/i18n/messages/ar.json";
import { seedListings } from "../src/lib/catalog";
import { plans } from "../src/lib/pricing";
import { matchesSearch } from "../src/i18n/search";
import { faqGroups } from "../src/lib/public-content";
import { guides } from "../src/lib/travel-guides";
test("localized search matches displayed Arabic cities and accented French titles", () => {
  assert.ok(matchesSearch("فاس", ["Fes", "فاس"], "ar"));
  assert.ok(matchesSearch("premiere", ["Prenez votre première vague"], "fr"));
  assert.ok(matchesSearch("اكادير", ["أكادير"], "ar"));
  assert.ok(!matchesSearch("طنجة", ["Agadir", "أكادير"], "ar"));
});
test("locale preference is allowlisted and takes priority over weighted browser preferences", () => {
  assert.equal(resolveLocale("en", "ar-MA,fr;q=0.9"), "en");
  assert.equal(resolveLocale(undefined, "de-DE,ar-MA;q=0.8,fr;q=0.9"), "fr");
  assert.equal(resolveLocale("invalid", "ar-MA,fr;q=0.5"), "ar");
  assert.equal(resolveLocale(undefined, "fr;q=0,en;q=0.8"), "en");
  assert.equal(resolveLocale(undefined, "de,es;q=0.9"), "en");
  assert.equal(isLocale("../../secret"), false);
});
test("French and Arabic dictionaries have matching non-empty keys and preserve placeholders", () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(ar).sort());
  for (const [key, value] of Object.entries(fr)) {
    assert.ok(value.trim(), key);
    assert.ok(ar[key as keyof typeof ar].trim(), key);
    const variables = (text: string) =>
      [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(variables(value), variables(key), `French ${key}`);
    assert.deepEqual(
      variables(ar[key as keyof typeof ar]),
      variables(key),
      `Arabic ${key}`,
    );
  }
});
test("translation retains spacing, interpolates values and leaves unknown user content intact", () => {
  const t = createTranslator("fr", fr);
  assert.equal(
    t(" Welcome back, {0}. ", { "0": "Lina" }),
    " Bon retour, Lina. ",
  );
  assert.equal(
    t("View {0} in {1}", { "0": "Dacia Duster", "1": t("Tangier") }),
    "Voir Dacia Duster à Tanger",
  );
  assert.equal(t("Welcome back, {0}.", { "0": "Name" }), "Bon retour, Name.");
  assert.equal(t("A customer’s own message"), "A customer’s own message");
  assert.equal(createTranslator("en", {})("Your trip"), "Your trip");
});
test("all authored static UI messages have both translations", () => {
  const missing = new Set<string>();
  const identity = new Set([
    "atlas",
    "journeys",
    "EUR",
    "you@example.com",
    "you@yourbusiness.com",
    "+212 ...",
  ]);
  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".tsx")) {
        const source = ts.createSourceFile(
          file,
          fs.readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        function visit(node: ts.Node) {
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "t" &&
            node.arguments[0] &&
            ts.isStringLiteral(node.arguments[0])
          ) {
            const key = node.arguments[0].text.trim();
            if (/[A-Za-z]/.test(key) && !identity.has(key) && !(key in fr))
              missing.add(key);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  walk("src/app");
  walk("src/components");
  assert.deepEqual([...missing], []);
  for (const listing of seedListings)
    for (const key of [
      listing.description,
      listing.badge,
      listing.fuel,
      listing.transmission,
    ])
      assert.ok(key in fr, `Sample catalog: ${key}`);
  for (const plan of plans)
    for (const key of [plan.name, plan.description])
      assert.ok(key in fr, `Protection: ${key}`);
  for (const group of faqGroups) {
    assert.ok(group.title in fr, group.title);
    for (const item of group.items)
      for (const text of [item.question, item.answer])
        assert.ok(text in fr, text);
  }
  for (const guide of guides)
    for (const text of [
      guide.title,
      guide.intro,
      ...guide.sections.flatMap((s) => [s.title, s.text]),
    ])
      assert.ok(text in fr, text);
});
