import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategories } from "@/server/catalog";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { DEFAULT_CATEGORIES, getMainCategories, getSubCategories, slugifyCategory } from "@/utils/categories";
import CategoryDirectoryImage from "@/components/store/CategoryDirectoryImage";

export const metadata = buildPageMetadata({
  title: "Shop by Category",
  description: "Browse all marketplace categories and subcategories, then find products from trusted sellers.",
  path: "/categories",
  keywords: ["product categories", "shop by category", "online marketplace"],
});

export default async function CategoriesPage() {
  const categories = await getCategories();
  const directoryCategories = categories.length
    ? categories
    : DEFAULT_CATEGORIES.map((name) => ({ id: name, name, slug: slugifyCategory(name), parent_id: null }));
  const mainCategories = getMainCategories(directoryCategories);
  const directorySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop by Category",
    description: "Browse marketplace categories and subcategories from trusted sellers.",
    url: absoluteUrl("/categories"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: mainCategories.map((category, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: category.name,
        url: absoluteUrl(`/products/${encodeURIComponent(category.slug)}`),
      })),
    },
  };

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directorySchema).replace(/</g, "\\u003c") }}
      />
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-poppins text-2xl font-bold text-foreground">Shop by Category</h1>
          <p className="mt-2 text-sm text-muted-foreground">Browse top-level categories and their subcategories.</p>
        </div>
        <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View all products <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {mainCategories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mainCategories.map((category) => {
            const subCategories = getSubCategories(directoryCategories, category.id);
            return (
              <section key={category.id || category.name} className="rounded-xl border border-border bg-white p-4">
                <Link href={`/products/${encodeURIComponent(category.slug)}`} className="group block">
                  <CategoryDirectoryImage category={category} />
                  <span className="flex items-center justify-between gap-3 font-semibold text-foreground group-hover:text-primary">
                    {category.name}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </span>
                </Link>
                {subCategories.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-border pt-3">
                    {subCategories.map((subCategory) => (
                      <li key={subCategory.id || subCategory.name}>
                        <Link
                          href={`/products/${encodeURIComponent(category.slug)}?subcategory=${encodeURIComponent(subCategory.name)}`}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                        >
                          <CategoryDirectoryImage category={subCategory} compact />
                          {subCategory.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No active categories are available.</p>
      )}
    </main>
  );
}