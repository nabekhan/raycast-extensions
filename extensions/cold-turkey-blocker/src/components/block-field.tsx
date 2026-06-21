import { Form, Icon } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { useBlockDescriptors } from "../hooks/use-blocks";
import { blockKindLabel, type BlockKind } from "../lib/cli-output";
import type { BlockDescriptor } from "../lib/cold-turkey";
import { formatCliError } from "../lib/ui";

interface BlockFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlockChange?: (block: BlockDescriptor | undefined) => void;
  preferredValue?: string;
  allowedKinds?: BlockKind[];
  id?: string;
  title?: string;
  error?: string;
}

export function BlockField({
  value,
  onChange,
  onBlockChange,
  preferredValue,
  allowedKinds,
  id = "blockName",
  title = "Block",
  error: fieldError,
}: BlockFieldProps) {
  const { data: allBlocks = [], isLoading, error: loadError } = useBlockDescriptors();
  const blocks = useMemo(
    () =>
      allowedKinds
        ? allBlocks.filter((block) => allowedKinds.includes(block.kind) || block.kind === "unknown")
        : allBlocks,
    [allBlocks, allowedKinds],
  );

  useEffect(() => {
    const selected = blocks.find((block) => block.name === value);
    if (selected) {
      onBlockChange?.(selected);
      return;
    }
    if (blocks.length === 0) {
      onBlockChange?.(undefined);
      return;
    }

    const preferred = preferredValue ? blocks.find((block) => block.name === preferredValue) : undefined;
    const next = preferred ?? blocks[0];
    onChange(next.name);
    onBlockChange?.(next);
  }, [blocks, onBlockChange, onChange, preferredValue, value]);

  function handleChange(nextValue: string) {
    onChange(nextValue);
    onBlockChange?.(blocks.find((block) => block.name === nextValue));
  }

  return (
    <>
      <Form.Dropdown
        id={id}
        title={title}
        value={value}
        onChange={handleChange}
        isLoading={isLoading}
        error={fieldError}
      >
        {blocks.length === 0 ? (
          <Form.Dropdown.Item value="" title={isLoading ? "Loading blocks…" : "No matching blocks found"} />
        ) : (
          blocks.map((block) => (
            <Form.Dropdown.Item
              key={`${block.kind}:${block.name}`}
              value={block.name}
              title={`${block.name} — ${blockKindLabel(block.kind)}`}
              icon={block.kind === "device" ? Icon.Desktop : Icon.Globe}
            />
          ))
        )}
      </Form.Dropdown>
      {loadError ? <Form.Description title="CLI Error" text={formatCliError(loadError)} /> : null}
    </>
  );
}
