import { Button } from "@/shared/ui";
import { useLogout } from "../api/use-logout";

export function LogoutButton() {
  const { logout } = useLogout();

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      Logout
    </Button>
  );
}
