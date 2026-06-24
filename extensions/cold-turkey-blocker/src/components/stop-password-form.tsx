import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildStopArgs } from "../lib/command-builders";
import type { BlockDescriptor } from "../lib/cold-turkey";
import type { BlockKind } from "../lib/cli-output";
import { executeCli } from "../lib/ui";

interface StopPasswordFormProps {
  blockName: string;
  blockKind: BlockKind;
  onSuccess?: () => void | Promise<void>;
}

export function StopPasswordForm({ blockName, blockKind, onSuccess }: StopPasswordFormProps) {
  const { pop } = useNavigation();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();

  async function handleSubmit() {
    setPasswordError(undefined);

    if (!password || /\s/.test(password) || password.includes('"') || password.includes("'")) {
      setPasswordError("Use the block password without spaces or quote characters.");
      return;
    }

    const descriptor: BlockDescriptor = { name: blockName, kind: blockKind };
    const result = await executeCli({
      args: buildStopArgs(blockName, password),
      workingTitle: `Stopping ${blockName}…`,
      successTitle: `Stopped ${blockName}`,
      verification: {
        type: "state",
        block: descriptor,
        expectedState: "disabled",
      },
      onSuccess: () => onSuccess?.(),
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle="Stop with Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Stop with Password" icon={Icon.Stop} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={blockName} />
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
