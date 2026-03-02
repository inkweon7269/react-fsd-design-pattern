import { Link, useNavigate } from "@tanstack/react-router";
import { RegisterForm } from "@/features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function RegisterPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate({ to: "/" });
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm onSuccess={handleSuccess} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/"
              className="font-medium underline underline-offset-4"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
