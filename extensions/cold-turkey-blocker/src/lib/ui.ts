import { Alert, Icon, Toast, confirmAlert, openExtensionPreferences, showToast } from "@raycast/api";
import {
  ColdTurkeyCliError,
  getPreferences,
  runColdTurkey,
  waitForBlockPresence,
  waitForBlockState,
  waitForKnownBlockState,
  type BlockDescriptor,
  type BlockInfo,
  type CliResult,
} from "./cold-turkey";
import { blockKindLabel, compactCliOutput, type BlockKind, type BlockState } from "./cli-output";

export type CliVerification =
  | {
      type: "state";
      block: BlockDescriptor;
      expectedState?: Exclude<BlockState, "unknown">;
    }
  | {
      type: "presence";
      blockName: string;
      expectedKind: BlockKind;
    };

export interface CliExecutionResult {
  cli: CliResult;
  status?: BlockInfo;
  createdBlock?: BlockDescriptor;
}

export interface ExecuteCliOptions {
  args: string[];
  workingTitle: string;
  successTitle: string;
  successMessage?: string;
  verification?: CliVerification;
  onSuccess?: (result: CliExecutionResult) => void | Promise<void>;
}

export async function executeCli(options: ExecuteCliOptions): Promise<CliExecutionResult | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: options.workingTitle });

  try {
    const cli = await runColdTurkey(options.args);
    const execution: CliExecutionResult = { cli };

    if (options.verification?.type === "state") {
      const { block, expectedState } = options.verification;
      execution.status = expectedState
        ? await waitForBlockState(block, expectedState)
        : await waitForKnownBlockState(block);
    } else if (options.verification?.type === "presence") {
      execution.createdBlock = await waitForBlockPresence(
        options.verification.blockName,
        options.verification.expectedKind,
      );
    }

    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    toast.message = successMessage(options, execution);
    await options.onSuccess?.(execution);
    return execution;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof ColdTurkeyCliError && error.kind === "verification-failed"
        ? "Could not verify change"
        : "Cold Turkey command failed";
    toast.message = formatCliError(error);

    if (error instanceof ColdTurkeyCliError && ["missing-executable", "permission-denied"].includes(error.kind)) {
      toast.primaryAction = {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      };
    }

    return undefined;
  }
}

export function formatCliError(error: unknown, maxLength = 320): string {
  if (error instanceof ColdTurkeyCliError) {
    const message = error.kind === "verification-failed" ? error.message : error.output || error.message;
    return compactCliOutput(message, maxLength) ?? error.message;
  }
  if (error instanceof Error) return compactCliOutput(error.message, maxLength) ?? error.name;
  return compactCliOutput(String(error), maxLength) ?? "Unknown error";
}

export async function confirmPotentialLock(
  title: string,
  message: string,
  actionTitle = "Start Block",
): Promise<boolean> {
  if (getPreferences().confirmLockingActions === false) return true;

  return confirmAlert({
    icon: Icon.Lock,
    title,
    message,
    primaryAction: {
      title: actionTitle,
      style: Alert.ActionStyle.Destructive,
    },
  });
}

function successMessage(options: ExecuteCliOptions, result: CliExecutionResult): string | undefined {
  if (options.successMessage) return options.successMessage;
  if (result.status) return `Status confirmed: ${capitalize(result.status.state)}`;
  if (result.createdBlock) return `Confirmed in ${blockKindLabel(result.createdBlock.kind)} blocks`;
  return compactCliOutput(result.cli.output) ?? "Command completed; the CLI returned no text output.";
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}
