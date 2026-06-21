import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useMemo, useState } from "react";
import { AddEntryForm } from "./components/add-entry-form";
import { CreateBlockForm } from "./components/create-block-form";
import { StartBlockForm } from "./components/start-block-form";
import { StopPasswordForm } from "./components/stop-password-form";
import { useBlocksWithStatus } from "./hooks/use-blocks";
import { buildBreakArgs, buildStartArgs, buildStopArgs, buildToggleArgs } from "./lib/command-builders";
import { getBlockStatusWithRetry, type BlockInfo } from "./lib/cold-turkey";
import { blockKindLabel, compactCliOutput, type BlockState } from "./lib/cli-output";
import { confirmPotentialLock, executeCli, formatCliError } from "./lib/ui";

type BlockFilter = "all" | "enabled" | "disabled" | "unknown-status" | "website-app" | "device";

export default function ManageBlocksCommand() {
  const { data: blocks = [], isLoading, error, revalidate } = useBlocksWithStatus();
  const [filter, setFilter] = useState<BlockFilter>("all");

  const sections = useMemo(() => {
    const visible = blocks
      .filter((block) => matchesFilter(block, filter))
      .sort((left, right) => left.name.localeCompare(right.name));

    return [
      { state: "enabled" as const, title: "Enabled", blocks: visible.filter((block) => block.state === "enabled") },
      { state: "disabled" as const, title: "Disabled", blocks: visible.filter((block) => block.state === "disabled") },
      {
        state: "unknown" as const,
        title: "Unknown Status",
        blocks: visible.filter((block) => block.state === "unknown"),
      },
    ];
  }, [blocks, filter]);

  const emptyTitle = error ? "Could not load Cold Turkey blocks" : "No Cold Turkey blocks found";
  const emptyDescription = error
    ? formatCliError(error)
    : "Create a block here, or verify that your Cold Turkey version supports -list-blocks.";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Cold Turkey blocks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter blocks" value={filter} onChange={(value) => setFilter(value as BlockFilter)}>
          <List.Dropdown.Item value="all" title="All Blocks" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item value="enabled" title="Enabled" />
            <List.Dropdown.Item value="disabled" title="Disabled" />
            <List.Dropdown.Item value="unknown-status" title="Unknown Status" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item value="website-app" title="Website & App Blocks" />
            <List.Dropdown.Item value="device" title="Device Blocks" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && blocks.length === 0 ? (
        <List.EmptyView
          icon={Icon.Shield}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.Push title="Create Block" icon={Icon.Plus} target={<CreateBlockForm onSuccess={revalidate} />} />
              <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {sections.map((section) =>
        section.blocks.length > 0 ? (
          <List.Section key={section.state} title={section.title} subtitle={String(section.blocks.length)}>
            {section.blocks.map((block) => (
              <BlockListItem key={`${block.kind}:${block.name}`} block={block} revalidate={revalidate} />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

function BlockListItem({ block, revalidate }: { block: BlockInfo; revalidate: () => void }) {
  const presentation = statusPresentation(block.state);
  const isDevice = block.kind === "device";

  async function startAsConfigured() {
    const confirmed = await confirmPotentialLock(
      `Start ${block.name} with saved settings?`,
      "The saved settings may include a lock that prevents stopping or editing the block until its conditions are met.",
    );
    if (!confirmed) return;

    await executeCli({
      args: buildStartArgs({ blockName: block.name, mode: "as-is" }),
      workingTitle: `Starting ${block.name}…`,
      successTitle: `Started ${block.name} as configured`,
      verification: { type: "state", block, expectedState: "enabled" },
      onSuccess: () => revalidate(),
    });
  }

  async function toggleBlock() {
    const current = await getBlockStatusWithRetry(block, { attempts: 2 });
    const expectedState = oppositeKnownState(current.state);
    await executeCli({
      args: buildToggleArgs(block.name),
      workingTitle: `Toggling ${block.name}…`,
      successTitle: `Toggled ${block.name}`,
      verification: { type: "state", block, expectedState },
      onSuccess: () => revalidate(),
    });
  }

  const primaryAction =
    block.state === "enabled" ? (
      <Action
        title={isDevice ? "Disable Device Block" : "Stop Block"}
        icon={Icon.Stop}
        onAction={() =>
          executeCli({
            args: buildStopArgs(block.name),
            workingTitle: `Stopping ${block.name}…`,
            successTitle: isDevice ? `Disabled ${block.name}` : `Stopped ${block.name}`,
            verification: { type: "state", block, expectedState: "disabled" },
            onSuccess: () => revalidate(),
          })
        }
      />
    ) : block.state === "disabled" ? (
      <Action
        title={isDevice ? "Enable Device Block Schedule" : "Start Block"}
        icon={Icon.Play}
        onAction={() =>
          executeCli({
            args: buildStartArgs({ blockName: block.name, mode: "unlocked" }),
            workingTitle: `Starting ${block.name}…`,
            successTitle: isDevice ? `Enabled ${block.name}` : `Started ${block.name}`,
            verification: { type: "state", block, expectedState: "enabled" },
            onSuccess: () => revalidate(),
          })
        }
      />
    ) : (
      <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={revalidate} />
    );

  const statusTooltip = [
    compactCliOutput(block.rawStatus, 400) ?? `Status: ${presentation.label}`,
    "Cold Turkey -status reports enabled/disabled only; it does not reveal lock type or remaining lock time.",
  ].join("\n\n");

  return (
    <List.Item
      id={`${block.kind}:${block.name}`}
      title={block.name}
      subtitle={{ value: blockKindLabel(block.kind), tooltip: typeTooltip(block) }}
      keywords={[blockKindLabel(block.kind), block.kind]}
      icon={{ source: presentation.icon, tintColor: presentation.color }}
      accessories={[
        {
          tag: { value: presentation.label, color: presentation.color },
          tooltip: statusTooltip,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Block">
            {primaryAction}
            <Action.Push
              title="Start with Options…"
              icon={Icon.Lock}
              target={<StartBlockForm fixedBlockName={block.name} fixedBlockKind={block.kind} onSuccess={revalidate} />}
            />
            <Action title="Start as Configured" icon={Icon.ArrowClockwise} onAction={startAsConfigured} />
            <Action.Push
              title="Stop with Password…"
              icon={Icon.Key}
              target={
                <StopPasswordForm fixedBlockName={block.name} fixedBlockKind={block.kind} onSuccess={revalidate} />
              }
            />
            <Action title="Toggle Block" icon={Icon.Switch} onAction={toggleBlock} />
          </ActionPanel.Section>

          {block.kind !== "device" ? (
            <ActionPanel.Section title="Websites">
              <Action.Push
                title="Add Website or Pattern…"
                icon={Icon.Globe}
                target={
                  <AddEntryForm
                    fixedBlockName={block.name}
                    fixedBlockKind={block.kind}
                    initialKind="website"
                    onSuccess={revalidate}
                  />
                }
              />
              <Action.Push
                title="Add Website Exception…"
                icon={Icon.Shield}
                target={
                  <AddEntryForm
                    fixedBlockName={block.name}
                    fixedBlockKind={block.kind}
                    initialKind="exception"
                    onSuccess={revalidate}
                  />
                }
              />
            </ActionPanel.Section>
          ) : null}

          <ActionPanel.Section title="Breaks">
            <Action
              title="Start Delay Break Countdown"
              icon={Icon.Play}
              onAction={() =>
                executeCli({
                  args: buildBreakArgs(block.name, "start-delay"),
                  workingTitle: `Starting delay break for ${block.name}…`,
                  successTitle: `Started delay break for ${block.name}`,
                })
              }
            />
            <Action
              title="Stop Delay Break"
              icon={Icon.Stop}
              onAction={() =>
                executeCli({
                  args: buildBreakArgs(block.name, "stop-delay"),
                  workingTitle: `Stopping delay break for ${block.name}…`,
                  successTitle: `Stopped delay break for ${block.name}`,
                })
              }
            />
            <Action
              title="Stop Random-Text Break"
              icon={Icon.Text}
              onAction={() =>
                executeCli({
                  args: buildBreakArgs(block.name, "stop-random-text"),
                  workingTitle: `Stopping random-text break for ${block.name}…`,
                  successTitle: `Stopped random-text break for ${block.name}`,
                  successMessage: "This controls a break; it does not remove a random-text block lock.",
                })
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Extension">
            <Action
              title="Refresh Blocks and Statuses"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action.Push
              title="Create Block…"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<CreateBlockForm onSuccess={revalidate} />}
            />
            <Action.CopyToClipboard
              title="Copy Block Name"
              content={block.name}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Raw Status" content={block.rawStatus || "No status output"} />
            <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function matchesFilter(block: BlockInfo, filter: BlockFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "enabled":
    case "disabled":
      return block.state === filter;
    case "unknown-status":
      return block.state === "unknown";
    case "website-app":
    case "device":
      return block.kind === filter;
  }
}

function oppositeKnownState(state: BlockState): "enabled" | "disabled" | undefined {
  if (state === "enabled") return "disabled";
  if (state === "disabled") return "enabled";
  return undefined;
}

function statusPresentation(state: BlockState): { label: string; icon: Icon; color: Color } {
  switch (state) {
    case "enabled":
      return { label: "Enabled", icon: Icon.Play, color: Color.Red };
    case "disabled":
      return { label: "Disabled", icon: Icon.Stop, color: Color.SecondaryText };
    case "unknown":
      return { label: "Unknown", icon: Icon.QuestionMarkCircle, color: Color.Yellow };
  }
}

function typeTooltip(block: BlockInfo): string {
  if (block.kind === "device") {
    return "Device-block status indicates whether its schedule is enabled. It does not prove the device action is active right now.";
  }
  if (block.kind === "website-app") return "Website & app block";
  return "The installed CLI did not identify this block's type.";
}
