import { Button } from "@/shared/ui";
import { useLogout } from "../api/use-logout";

export function LogoutButton() {
  const { mutate, isPending } = useLogout();

  return (
    <Button variant="ghost" size="sm" onClick={() => mutate()} disabled={isPending}>
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
