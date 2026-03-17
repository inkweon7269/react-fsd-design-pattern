import { useNavigate } from "@tanstack/react-router";
import { useProfile, ProfileCard } from "@/entities/session";
import { Button, Skeleton } from "@/shared/ui";

export function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError, error } = useProfile();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-destructive">
          Failed to load profile: {error.message}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/posts" })}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground">Profile not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/posts" })}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/posts" })}
        >
          &larr; Back to Posts
        </Button>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 text-muted-foreground">
          View your account information
        </p>
      </div>
      <ProfileCard profile={profile} />
    </div>
  );
}
