import { Link, useNavigate } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function LoginPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate({ to: "/posts" });
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm onSuccess={handleSuccess} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium underline underline-offset-4"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
