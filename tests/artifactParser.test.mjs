import assert from "node:assert/strict";
import {
  normalizeMessageMarkup,
  parseContent,
} from "../src/pages/chat/components/artifactParser.js";

const raw = [
  "Intro",
  "<!DOCTYPE html>",
  "<html><head><title>Demo</title></head><body>A<br>B</body></html>",
  "Done",
].join("\n");
const normalized = normalizeMessageMarkup(raw);
assert.match(normalized, /A<br>B/);

const blocks = parseContent(normalized);
const rawArtifact = blocks.find((block) => block.type === "artifact");
assert.equal(blocks.filter((block) => block.type === "artifact").length, 1);
assert.equal(rawArtifact.label, "Demo");
assert.equal(rawArtifact.complete, true);

const fenced = parseContent([
  "```html",
  "<!doctype html><html><body>OK</body></html>",
  "```",
].join("\n"));
assert.equal(fenced[0].type, "artifact");
assert.equal(fenced[0].complete, true);

const partial = parseContent("<!doctype html>\n<html><body>Building");
assert.equal(partial[0].type, "artifact");
assert.equal(partial[0].complete, false);

console.log("artifact parser: 8 assertions passed");
