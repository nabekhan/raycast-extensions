import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BlockField } from "./block-field";
import { buildStartArgs, type StartMode } from "../lib/command-builders";
import type { BlockDescriptor } from "../lib/cold-turkey";
import { blockKindLabel, type BlockKind } from "../lib/cli-output";
import { confirmPotentialLock, executeCli } from "../lib/ui";

interface StartBlockFormProps {
  initialBlockName?: string;
  fixedBlockName?: string;
  fixedBlockKind?: BlockKind;
  onSuccess?: () => void | Promise<void>;
}

export function StartBlockForm({ initialBlockName, fixedBlockName, fixedBlockKind, onSuccess }: StartBlockFormProps) {
  const { pop } = useNavigation();
  const [blockName, setBlockName] = useState(fixedBlockName ?? initialBlockName ?? "");
  const [selectedBlock, setSelectedBlock] = useState<BlockDescriptor | undefined>(
    fixedBlockName ? { name: fixedBlockName, kind: fixedBlockKind ?? "unknown" } : undefined,
  );
  const [mode, setMode] = useState<StartMode>("unlocked");
  const [minutes, setMinutes] = useState("60");
  const [password, setPassword] = useState("");
  const [randomTextLength, setRandomTextLength] = useState("100");
  const [blockError, setBlockError] = useState<string>();
  const [minutesError, setMinutesError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [randomTextError, setRandomTextError] = useState<string>();

  async function handleSubmit() {
    clearErrors();

    const selectedName = (fixedBlockName ?? blockName).trim();
    if (!selectedName) {
      setBlockError("Select a block.");
      return;
    }

    const descriptor: BlockDescriptor = selectedBlock ?? {
      name: selectedName,
      kind: fixedBlockKind ?? "unknown",
    };
    const parsedMinutes = parseWholeNumber(minutes);
    const parsedRandomTextLength = parseWholeNumber(randomTextLength);

    if (mode === "timed" && (parsedMinutes === undefined || parsedMinutes < 1)) {
      setMinutesError("Enter a whole number of at least 1 minute.");
      return;
    }

    if (mode === "password" && !isValidCliPassword(password)) {
      setPasswordError("Use a non-empty password without spaces or quote characters.");
      return;
    }

    if (
      mode === "random-text" &&
      (parsedRandomTextLength === undefined || parsedRandomTextLength < 1 || parsedRandomTextLength > 999)
    ) {
      setRandomTextError("Enter a whole number between 1 and 999.");
      return;
    }

    if (mode !== "unlocked") {
      const confirmed = await confirmPotentialLock(
        confirmationTitle(mode, selectedName),
        confirmationMessage(mode, descriptor.kind, parsedMinutes, parsedRandomTextLength),
      );
      if (!confirmed) return;
    }

    let args: string[];
    try {
      args = buildStartArgs({
        blockName: selectedName,
        mode,
        minutes: parsedMinutes,
        password,
        randomTextLength: parsedRandomTextLength,
      });
    } catch (error) {
      setBlockError(error instanceof Error ? error.message : String(error));
      return;
    }

    const result = await executeCli({
      args,
      workingTitle: `Starting ${selectedName}…`,
      successTitle: descriptor.kind === "device" ? `Enabled ${selectedName}` : `Started ${selectedName}`,
      verification: { type: "state", block: descriptor, expectedState: "enabled" },
      onSuccess: () => onSuccess?.(),
    });

    if (result) pop();
  }

  function clearErrors() {
    setBlockError(undefined);
    setMinutesError(undefined);
    setPasswordError(undefined);
    setRandomTextError(undefined);
  }

  const selectedKind = selectedBlock?.kind ?? fixedBlockKind ?? "unknown";

  return (
    <Form
      navigationTitle={fixedBlockName ? `Start ${fixedBlockName}` : "Start Cold Turkey Block"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle(mode, selectedKind)} icon={submitIcon(mode)} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {fixedBlockName ? (
        <>
          <Form.Description title="Block" text={fixedBlockName} />
          <Form.Description title="Type" text={blockKindLabel(selectedKind)} />
        </>
      ) : (
        <BlockField
          value={blockName}
          onChange={(value) => {
            setBlockName(value);
            setBlockError(undefined);
          }}
          onBlockChange={setSelectedBlock}
          preferredValue={initialBlockName}
          error={blockError}
        />
      )}

      <Form.Dropdown id="mode" title="Start Mode" value={mode} onChange={(value) => setMode(value as StartMode)}>
        <Form.Dropdown.Item
          value="unlocked"
          title={selectedKind === "device" ? "Enable Scheduled Device Block" : "Start Unlocked"}
          icon={Icon.Play}
        />
        <Form.Dropdown.Item value="as-is" title="Start With Saved Settings (-as-is)" icon={Icon.ArrowClockwise} />
        <Form.Dropdown.Item value="timed" title="Start With Timed Lock" icon={Icon.Clock} />
        <Form.Dropdown.Item value="password" title="Start With Password Lock (Pro)" icon={Icon.Key} />
        <Form.Dropdown.Item value="random-text" title="Start With Random Text Lock" icon={Icon.Text} />
      </Form.Dropdown>

      {selectedKind === "device" && mode === "unlocked" ? (
        <Form.Description
          title="Scheduled Device Block"
          text="This enables the device block's configured schedule. It does not force the lock-screen, sign-out, or shut-down action immediately. Use a timed lock for immediate activation."
        />
      ) : null}

      {mode === "as-is" ? (
        <Form.Description
          title="Saved Settings"
          text="Uses the block's previously configured block type and lock. This can re-apply a lock."
        />
      ) : null}

      {mode === "timed" ? (
        <>
          <Form.TextField
            id="minutes"
            title="Lock Duration"
            placeholder="60"
            value={minutes}
            onChange={(value) => {
              setMinutes(value);
              setMinutesError(undefined);
            }}
            error={minutesError}
            info="Minutes. Cold Turkey rejects a value shorter than any remaining timed lock."
          />
          {selectedKind === "device" ? (
            <Form.Description
              title="Immediate Device Action"
              text="For a device block, -lock may immediately lock the screen, sign out, or shut down, depending on the block's configured type."
            />
          ) : null}
        </>
      ) : null}

      {mode === "password" ? (
        <>
          <Form.PasswordField
            id="password"
            title="Block Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError(undefined);
            }}
            error={passwordError}
            info="Cold Turkey CLI does not allow spaces or quote characters. The extension does not store this value."
          />
          {selectedKind === "device" ? (
            <Form.Description
              title="Device Requirement"
              text="Cold Turkey 4.9 only supports password locks for scheduled device blocks."
            />
          ) : null}
        </>
      ) : null}

      {mode === "random-text" ? (
        <>
          <Form.TextField
            id="randomTextLength"
            title="Random Text Length"
            placeholder="100"
            value={randomTextLength}
            onChange={(value) => {
              setRandomTextLength(value);
              setRandomTextError(undefined);
            }}
            error={randomTextError}
            info="Whole number between 1 and 999. This creates a lock, not a random-text break."
          />
          {selectedKind === "device" ? (
            <Form.Description
              title="Device Requirement"
              text="Cold Turkey 4.9 only supports random-text locks for scheduled device blocks."
            />
          ) : null}
        </>
      ) : null}
    </Form>
  );
}

function parseWholeNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isValidCliPassword(value: string): boolean {
  return value.length > 0 && !/\s/.test(value) && !value.includes('"') && !value.includes("'");
}

function submitTitle(mode: StartMode, kind: BlockKind): string {
  switch (mode) {
    case "unlocked":
      return kind === "device" ? "Enable Device Block" : "Start Block";
    case "as-is":
      return "Start as Configured";
    case "timed":
      return "Start and Lock";
    case "password":
      return "Start With Password";
    case "random-text":
      return "Start With Random Text";
  }
}

function submitIcon(mode: StartMode): Icon {
  return mode === "unlocked" ? Icon.Play : Icon.Lock;
}

function confirmationTitle(mode: StartMode, blockName: string): string {
  if (mode === "as-is") return `Start ${blockName} with saved settings?`;
  return `Start and lock ${blockName}?`;
}

function confirmationMessage(mode: StartMode, kind: BlockKind, minutes?: number, randomTextLength?: number): string {
  switch (mode) {
    case "as-is":
      return "The saved settings may include a lock that prevents stopping or editing the block until its conditions are met.";
    case "timed":
      return kind === "device"
        ? `The device action may occur immediately and remain in effect for ${minutes ?? "the selected number of"} minute(s).`
        : `The block will be locked for ${minutes ?? "the selected number of"} minute(s).`;
    case "password":
      return "The block will require the supplied password to stop. Keep the password somewhere appropriate.";
    case "random-text":
      return `Stopping or editing may require entering ${randomTextLength ?? "the selected number of"} random characters.`;
    case "unlocked":
      return "";
  }
}
