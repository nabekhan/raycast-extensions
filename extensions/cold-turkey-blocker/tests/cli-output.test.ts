import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanCliOutput,
  compactCliOutput,
  decodeCliOutput,
  extractCliError,
  looksLikeCliError,
  looksLikeHelpOutput,
  parseBlockList,
  parseBlockNames,
  parseBlockState,
} from "../src/lib/cli-output";

test("cleans BOM, ANSI sequences, null bytes, and Windows line endings", () => {
  assert.equal(
    cleanCliOutput("\uFEFF\u001B[31mHello\u001B[0m\r\nW\0orld\r\n"),
    "Hello\nWorld",
  );
});

test("decodes UTF-8 and UTF-16LE CLI output", () => {
  assert.equal(decodeCliOutput(Buffer.from("Enabled\r\n", "utf8")), "Enabled");
  assert.equal(
    decodeCliOutput(
      Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from("Disabled\r\n", "utf16le"),
      ]),
    ),
    "Disabled",
  );
  assert.equal(
    decodeCliOutput(Buffer.from("Enabled\r\n", "utf16le")),
    "Enabled",
  );
});

test("parses line-oriented block names", () => {
  assert.deepEqual(
    parseBlockNames(
      'Blocks:\r\n1. Deep Work\r\n• "Social Media"\r\n- Frozen Turkey\r\n',
    ),
    ["Deep Work", "Social Media", "Frozen Turkey"],
  );
});

test("parses Cold Turkey 4.9 block sections without treating headings as blocks", () => {
  const output = [
    "Website & App Blocks",
    "World Wide Web",
    "Distractions",
    "stop coding",
    "",
    "Device Blocks",
    "Raycast_Test_SignOut",
    "Raycast_Test_Device",
    "Raycast_Test_ShutDown",
  ].join("\n");

  assert.deepEqual(parseBlockList(output), [
    { name: "World Wide Web", kind: "website-app" },
    { name: "Distractions", kind: "website-app" },
    { name: "stop coding", kind: "website-app" },
    { name: "Raycast_Test_SignOut", kind: "device" },
    { name: "Raycast_Test_Device", kind: "device" },
    { name: "Raycast_Test_ShutDown", kind: "device" },
  ]);
});

test("parses names when status is included", () => {
  assert.deepEqual(
    parseBlockNames("Deep Work: enabled\nSocial Media - disabled"),
    ["Deep Work", "Social Media"],
  );
});

test("parses a JSON string array if a future CLI returns one", () => {
  assert.deepEqual(parseBlockNames('["Deep Work", "Social Media"]'), [
    "Deep Work",
    "Social Media",
  ]);
});

test("returns an empty list for no-blocks output", () => {
  assert.deepEqual(parseBlockNames("No blocks found."), []);
});

test("recognizes CLI help output", () => {
  assert.equal(
    looksLikeHelpOutput(
      '-start "Block Name"\nStarts the specified block.\n-list-blocks\nDisplays all blocks.',
    ),
    true,
  );
});

test("recognizes semantic CLI errors even if a process exits successfully", () => {
  assert.equal(
    looksLikeCliError(
      "Error: Invalid block name. This block name is already used.",
    ),
    true,
  );
  assert.equal(
    looksLikeCliError("=> Error: A lock is already set for this block."),
    true,
  );
  assert.equal(
    extractCliError("=> Error: A lock is already set for this block."),
    "Error: A lock is already set for this block.",
  );
  assert.equal(looksLikeCliError("Enabled"), false);
});

test("parses common enabled and disabled status formats", () => {
  assert.equal(parseBlockState("enabled"), "enabled");
  assert.equal(parseBlockState("=> Enabled"), "enabled");
  assert.equal(parseBlockState("Deep Work is enabled."), "enabled");
  assert.equal(parseBlockState("Status: disabled"), "disabled");
  assert.equal(parseBlockState("OFF"), "disabled");
  assert.equal(parseBlockState("something unexpected"), "unknown");
});

test("compacts long output", () => {
  assert.equal(compactCliOutput("one\n\n two", 100), "one two");
  assert.equal(compactCliOutput("1234567890", 6), "12345…");
});
