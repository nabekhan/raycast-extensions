import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { BlockField } from "./block-field";
import { buildAddEntryArgs, type EntryKind } from "../lib/command-builders";
import { runColdTurkey, type BlockDescriptor } from "../lib/cold-turkey";
import type { BlockKind } from "../lib/cli-output";
import { formatCliError } from "../lib/ui";

interface AddEntryFormProps {
  fixedBlockName?: string;
  fixedBlockKind?: BlockKind;
  initialBlockName?: string;
  initialKind?: EntryKind;
  onSuccess?: () => void | Promise<void>;
}

export function AddEntryForm({
  fixedBlockName,
  fixedBlockKind,
  initialBlockName,
  initialKind = "website",
  onSuccess,
}: AddEntryFormProps) {
  const { pop } = useNavigation();
  const [blockName, setBlockName] = useState(fixedBlockName ?? initialBlockName ?? "");
  const [selectedBlock, setSelectedBlock] = useState<BlockDescriptor | undefined>(
    fixedBlockName ? { name: fixedBlockName, kind: fixedBlockKind ?? "unknown" } : undefined,
  );
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [entriesText, setEntriesText] = useState("");
  const [blockError, setBlockError] = useState<string>();
  const [entriesError, setEntriesError] = useState<string>();

  async function handleSubmit() {
    const selectedName = (fixedBlockName ?? blockName).trim();
    const entries = unique(
      entriesText
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    );

    setBlockError(undefined);
    setEntriesError(undefined);

    if (!selectedName) {
      setBlockError("Select a block.");
      return;
    }
    if ((selectedBlock?.kind ?? fixedBlockKind) === "device") {
      setBlockError("Cold Turkey only supports website and exception entries on Website & App blocks.");
      return;
    }
    if (entries.length === 0) {
      setEntriesError("Enter at least one website or pattern.");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${entries.length} ${entryNoun(kind, entries.length)}…`,
      message: selectedName,
    });

    let successCount = 0;
    const failures: { entry: string; error: unknown }[] = [];

    for (const [index, entry] of entries.entries()) {
      toast.title = `Adding ${index + 1} of ${entries.length}…`;
      try {
        await runColdTurkey(buildAddEntryArgs(selectedName, kind, entry));
        successCount += 1;
      } catch (error) {
        failures.push({ entry, error });
      }
    }

    if (successCount > 0) await onSuccess?.();

    if (failures.length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `${successCount} added, ${failures.length} failed`;
      toast.message = `${failures[0].entry}: ${formatCliError(failures[0].error, 220)}`;
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = `Added ${successCount} ${entryNoun(kind, successCount)}`;
    toast.message = "Cold Turkey returned no error; this CLI has no entry read-back command.";
    pop();
  }

  return (
    <Form
      navigationTitle={kind === "website" ? "Add Websites" : "Add Website Exceptions"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={kind === "website" ? "Add to Website List" : "Add to Exception List"}
            icon={kind === "website" ? Icon.Globe : Icon.Shield}
            onSubmit={handleSubmit}
          />
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
          allowedKinds={["website-app"]}
          error={blockError}
        />
      )}

      <Form.Dropdown id="kind" title="Destination" value={kind} onChange={(value) => setKind(value as EntryKind)}>
        <Form.Dropdown.Item value="website" title="Website List" icon={Icon.Globe} />
        <Form.Dropdown.Item value="exception" title="Exception List" icon={Icon.Shield} />
      </Form.Dropdown>

      <Form.TextArea
        id="entries"
        title="Websites or Patterns"
        placeholder={"youtube.com\nreddit.com/r/all\n*example*"}
        value={entriesText}
        onChange={(value) => {
          setEntriesText(value);
          setEntriesError(undefined);
        }}
        error={entriesError}
        info="One entry per line. Cold Turkey wildcard patterns are accepted; a URL scheme is not required."
      />

      {kind === "exception" ? (
        <Form.Description
          title="Unlocked Blocks Only"
          text="Cold Turkey only allows the CLI to add exceptions while the selected block is unlocked."
        />
      ) : null}
    </Form>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function entryNoun(kind: EntryKind, count: number): string {
  const singular = kind === "website" ? "website" : "exception";
  return count === 1 ? singular : `${singular}s`;
}
