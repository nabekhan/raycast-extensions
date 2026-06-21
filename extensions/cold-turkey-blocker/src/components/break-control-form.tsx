import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BlockField } from "./block-field";
import { buildBreakArgs, type BreakAction } from "../lib/command-builders";
import { executeCli } from "../lib/ui";

interface BreakControlFormProps {
  fixedBlockName?: string;
  initialBlockName?: string;
  initialAction?: BreakAction;
  onSuccess?: () => void | Promise<void>;
}

export function BreakControlForm({
  fixedBlockName,
  initialBlockName,
  initialAction = "start-delay",
  onSuccess,
}: BreakControlFormProps) {
  const { pop } = useNavigation();
  const [blockName, setBlockName] = useState(fixedBlockName ?? initialBlockName ?? "");
  const [action, setAction] = useState<BreakAction>(initialAction);
  const [blockError, setBlockError] = useState<string>();

  async function handleSubmit() {
    const selectedBlock = (fixedBlockName ?? blockName).trim();
    setBlockError(undefined);

    if (!selectedBlock) {
      setBlockError("Select a block.");
      return;
    }

    const result = await executeCli({
      args: buildBreakArgs(selectedBlock, action),
      workingTitle: `${breakActionTitle(action)}…`,
      successTitle: breakSuccessTitle(action, selectedBlock),
      onSuccess,
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle="Control Cold Turkey Break"
      actions={
        <ActionPanel>
          <Action.SubmitForm title={breakActionTitle(action)} icon={Icon.Stopwatch} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {fixedBlockName ? (
        <Form.Description title="Block" text={fixedBlockName} />
      ) : (
        <BlockField
          value={blockName}
          onChange={(value) => {
            setBlockName(value);
            setBlockError(undefined);
          }}
          preferredValue={initialBlockName}
          error={blockError}
        />
      )}

      <Form.Dropdown
        id="action"
        title="Break Action"
        value={action}
        onChange={(value) => setAction(value as BreakAction)}
      >
        <Form.Dropdown.Item value="start-delay" title="Start Delay Break Countdown" icon={Icon.Play} />
        <Form.Dropdown.Item value="stop-delay" title="Stop Delay Break" icon={Icon.Stop} />
        <Form.Dropdown.Item value="stop-random-text" title="Stop Random-Text Break" icon={Icon.Text} />
      </Form.Dropdown>

      <Form.Description
        title="Breaks vs. Locks"
        text="These commands control configured break workflows. Stop Random-Text Break does not remove a block's random-text lock, and -status cannot report whether a break is active."
      />
    </Form>
  );
}

function breakActionTitle(action: BreakAction): string {
  switch (action) {
    case "start-delay":
      return "Start Delay Break";
    case "stop-delay":
      return "Stop Delay Break";
    case "stop-random-text":
      return "Stop Random Text Break";
  }
}

function breakSuccessTitle(action: BreakAction, blockName: string): string {
  switch (action) {
    case "start-delay":
      return `Started delay break for ${blockName}`;
    case "stop-delay":
      return `Stopped delay break for ${blockName}`;
    case "stop-random-text":
      return `Stopped random text break for ${blockName}`;
  }
}
