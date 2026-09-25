import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request) {
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (expectedSecret && request.headers.get("x-revalidate-secret") !== expectedSecret) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { tags = [], paths = [] } = await request.json();
  tags.forEach((tag) => revalidateTag(tag, "max"));
  paths.forEach((path) => revalidatePath(path));
  return Response.json({ revalidated: true, tags, paths });
}