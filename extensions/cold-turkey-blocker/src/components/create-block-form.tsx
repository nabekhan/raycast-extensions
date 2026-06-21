import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildCreateBlockArgs, type BlockCreationKind } from "../lib/command-builders";
import { listBlocks } from "../lib/cold-turkey";
import type { BlockKind } from "../lib/cli-output";
import { executeCli, formatCliError } from "../lib/ui";

interface CreateBlockFormProps {
  onSuccess?: () => void | Promise<void>;
}

export function CreateBlockForm({ onSuccess }: CreateBlockFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BlockCreationKind>("website-app");
  const [nameError, setNameError] = useState<string>();

  async function handleSubmit() {
    const trimmedName = name.trim();
    setNameError(undefined);

    if (!trimmedName) {
      setNameError("Enter a block name.");
      return;
    }
    if (/[\r\n\0]/.test(trimmedName)) {
      setNameError("Block names cannot contain line breaks or null characters.");
      return;
    }

    try {
      const existing = (await listBlocks()).find(
        (block) => block.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
      );
      if (existing) {
        setNameError(`A block named “${existing.name}” already exists.`);
        return;
      }
    } catch (error) {
      setNameError(`Could not check existing names: ${formatCliError(error, 180)}`);
      return;
    }

    const result = await executeCli({
      args: buildCreateBlockArgs(trimmedName, kind),
      workingTitle: `Creating ${trimmedName}…`,
      successTitle: `Created ${trimmedName}`,
      verification: { type: "presence", blockName: trimmedName, expectedKind: creationBlockKind(kind) },
      onSuccess: () => onSuccess?.(),
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle="Create Cold Turkey Block"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Block" icon={Icon.Plus} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Block Name"
        placeholder="Deep Work"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        error={nameError}
        info="Names are checked case-insensitively before creation, then confirmed through -list-blocks."
      />

      <Form.Dropdown
        id="kind"
        title="Block Type"
        value={kind}
        onChange={(value) => setKind(value as BlockCreationKind)}
      >
        <Form.Dropdown.Item value="website-app" title="Website & App Block" icon={Icon.Globe} />
        <Form.Dropdown.Item value="device-lock" title="Device Block — Lock Screen" icon={Icon.Lock} />
        <Form.Dropdown.Item value="device-sign-out" title="Device Block — Sign Out" icon={Icon.Person} />
        <Form.Dropdown.Item value="device-shut-down" title="Device Block — Shut Down" icon={Icon.Power} />
      </Form.Dropdown>

      {kind !== "website-app" ? (
        <Form.Description
          title="Device Block"
          text="This creates the device block only. It does not activate it. A basic start enables its schedule; a timed start may activate the configured device action immediately."
        />
      ) : null}
    </Form>
  );
}

function creationBlockKind(kind: BlockCreationKind): BlockKind {
  return kind === "website-app" ? "website-app" : "device";
}
