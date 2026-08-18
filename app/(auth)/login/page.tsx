import { LoginForm } from "@/components/auth/LoginForm";
import { isGoogleAuthEnabled } from "@/lib/auth/config";

interface LoginPageProps {
  searchParams: Promise<{ registered?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;

  return (
    <>
      {registered && (
        <div className="fixed left-0 right-0 top-4 z-10 mx-auto max-w-md px-4">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
            Account created. Please sign in.
          </p>
        </div>
      )}
      <LoginForm googleAuthEnabled={isGoogleAuthEnabled()} />
    </>
  );
}
