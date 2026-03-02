import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@/shared/ui";
import type { UserProfile } from "../model/types";

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const createdDate = new Date(profile.createdAt).toLocaleDateString();
  const updatedDate = new Date(profile.updatedAt).toLocaleDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{profile.name}</CardTitle>
        <CardDescription>{profile.email}</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              User ID
            </dt>
            <dd className="text-sm">{profile.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
            <dd className="text-sm">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Member Since
            </dt>
            <dd className="text-sm">{createdDate}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Last Updated
            </dt>
            <dd className="text-sm">{updatedDate}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
