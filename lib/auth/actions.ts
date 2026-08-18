"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/auth";
import { userRepository, UserRepositoryError } from "@/lib/users/repository";
import { createCreditAccountForUser } from "@/lib/credits";
import { resolveRoleForEmail } from "@/lib/admin/config";
import { isGoogleAuthEnabled } from "@/lib/auth/config";
import { isPostgresEnabled } from "@/lib/db/config";
import { LOG_EVENTS } from "@/lib/logging/events";
import { logger } from "@/lib/logging/logger";
import { metrics } from "@/lib/metrics";
import { AuthError } from "next-auth";

const MIN_PASSWORD_LENGTH = 8;

export async function signInWithGoogle() {
  if (!isGoogleAuthEnabled()) {
    redirect("/login?error=google_not_configured");
  }
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      metrics.authLoginFailureTotal.inc();
      logger.info(LOG_EVENTS.AUTH_LOGIN, { status: "failed" });
      return { error: "Invalid email or password." };
    }

    metrics.authLoginSuccessTotal.inc();
    logger.info(LOG_EVENTS.AUTH_LOGIN, { status: "success" });
    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function signUpWithCredentials(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { error: "All fields are required." };
  }

  if (!email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await userRepository.create({
      name,
      email,
      passwordHash,
      provider: "credentials",
      role: resolveRoleForEmail(email),
    });
    if (isPostgresEnabled()) {
      await createCreditAccountForUser(created.id);
    }
    metrics.authSignupTotal.inc();
    logger.info(LOG_EVENTS.AUTH_SIGNUP, { userId: created.id });
  } catch (error) {
    if (error instanceof UserRepositoryError && error.code === "DUPLICATE_EMAIL") {
      return { error: "An account with this email already exists." };
    }
    return { error: "Unable to create account. Please try again." };
  }

  redirect("/login?registered=1");
}

export async function logoutAction() {
  logger.info(LOG_EVENTS.AUTH_LOGOUT);
  await signOut({ redirectTo: "/login" });
}
