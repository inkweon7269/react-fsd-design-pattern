export const sessionQueryKeys = {
  all: ["session"] as const,
  current: () => [...sessionQueryKeys.all, "current"] as const,
  profile: () => [...sessionQueryKeys.all, "profile"] as const,
};
