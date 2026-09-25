import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}