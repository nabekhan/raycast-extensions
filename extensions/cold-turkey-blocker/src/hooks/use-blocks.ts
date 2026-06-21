import { useCachedPromise } from "@raycast/utils";
import { listBlocks, listBlocksWithStatus } from "../lib/cold-turkey";

const CACHE_SCHEMA = "cold-turkey-4.9-v2";

async function loadBlockDescriptors(schema: string) {
  void schema;
  return listBlocks();
}

async function loadBlocksWithStatus(schema: string) {
  void schema;
  return listBlocksWithStatus();
}

export function useBlockDescriptors() {
  return useCachedPromise(loadBlockDescriptors, [CACHE_SCHEMA], {
    initialData: [],
    failureToastOptions: {
      title: "Could not list Cold Turkey blocks",
    },
  });
}

export function useBlockNames() {
  const result = useBlockDescriptors();
  return {
    ...result,
    data: result.data?.map((block) => block.name) ?? [],
  };
}

export function useBlocksWithStatus() {
  return useCachedPromise(loadBlocksWithStatus, [CACHE_SCHEMA], {
    initialData: [],
    failureToastOptions: {
      title: "Could not load Cold Turkey blocks",
    },
  });
}
