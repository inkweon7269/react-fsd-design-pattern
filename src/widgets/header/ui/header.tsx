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
              <Button asChild variant="ghost">
                <Link to="/posts">All Posts</Link>
              </Button>
              <Button asChild>
                <Link to="/posts/create">New Post</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/profile">Profile</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
