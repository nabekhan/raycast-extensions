import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BlockField } from "./block-field";
import { buildStopArgs } from "../lib/command-builders";
import type { BlockDescriptor } from "../lib/cold-turkey";
import type { BlockKind } from "../lib/cli-output";
import { executeCli } from "../lib/ui";

interface StopPasswordFormProps {
  fixedBlockName?: string;
  fixedBlockKind?: BlockKind;
  initialBlockName?: string;
  onSuccess?: () => void | Promise<void>;
}

export function StopPasswordForm({
  fixedBlockName,
  fixedBlockKind,
  initialBlockName,
  onSuccess,
}: StopPasswordFormProps) {
  const { pop } = useNavigation();
  const [blockName, setBlockName] = useState(fixedBlockName ?? initialBlockName ?? "");
  const [selectedBlock, setSelectedBlock] = useState<BlockDescriptor | undefined>(
    fixedBlockName ? { name: fixedBlockName, kind: fixedBlockKind ?? "unknown" } : undefined,
  );
  const [password, setPassword] = useState("");
  const [blockError, setBlockError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  async function handleSubmit() {
    const selectedName = (fixedBlockName ?? blockName).trim();
    setBlockError(undefined);
    setPasswordError(undefined);

    if (!selectedName) {
      setBlockError("Select a block.");
      return;
    }
    if (!password || /\s/.test(password) || password.includes('"') || password.includes("'")) {
      setPasswordError("Use the block password without spaces or quote characters.");
      return;
    }

    const descriptor = selectedBlock ?? { name: selectedName, kind: fixedBlockKind ?? ("unknown" as const) };
    const result = await executeCli({
      args: buildStopArgs(selectedName, password),
      workingTitle: `Stopping ${selectedName}…`,
      successTitle: `Stopped ${selectedName}`,
      verification: { type: "state", block: descriptor, expectedState: "disabled" },
      onSuccess: () => onSuccess?.(),
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle={fixedBlockName ? `Stop ${fixedBlockName}` : "Stop Password Block"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Stop with Password" icon={Icon.Stop} onSubmit={handleSubmit} />
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
          onBlockChange={setSelectedBlock}
          preferredValue={initialBlockName}
          error={blockError}
        />
      )}
      <Form.PasswordField
        id="password"
        title="Block Password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setPasswordError(undefined);
        }}
        error={passwordError}
        info="The password remains only in this form and is not stored by the extension. Successful stopping is confirmed with -status."
      />
    </Form>
  );
}
