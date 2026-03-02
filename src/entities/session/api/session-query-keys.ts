export const sessionQueryKeys = {
  all: ["session"] as const,
  current: () => [...sessionQueryKeys.all, "current"] as const,
};
