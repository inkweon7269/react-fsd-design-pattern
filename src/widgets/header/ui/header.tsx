import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui";
import { useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/posts" className="text-xl font-bold">
          Posts App
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Link to="/posts">
                <Button variant="ghost">All Posts</Button>
              </Link>
              <Link to="/posts/create">
                <Button>New Post</Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
