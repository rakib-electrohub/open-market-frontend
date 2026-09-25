export const DEFAULT_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty",
  "Sports",
  "Groceries",
  "Toys",
  "Books",
  "Automotive",
];

const uniqueClean = (items) => {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const slugify = (value) => String(value || "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export const parseCategoryList = (value, fallback = DEFAULT_CATEGORIES) => {
  if (!value) return fallback;

  if (Array.isArray(value)) {
    const categories = uniqueClean(value);
    return categories.length ? categories : fallback;
  }

  const text = String(value).trim();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const categories = uniqueClean(parsed);
      return categories.length ? categories : fallback;
    }
  } catch {
    // Settings currently store categories as newline text.
  }

  const categories = uniqueClean(text.split(/\r?\n|,/));
  return categories.length ? categories : fallback;
};

export const getCategoriesFromSettings = (settings = {}, fallback = DEFAULT_CATEGORIES) => {
  // Legacy settings for category names were removed. Return fallback/default categories.
  return fallback;
};

export const normalizeCategoryRecord = (category = {}) => {
  const safeName = String(category?.name || category?.title || "").trim();
  const safeId = category?.id || category?._id || null;
  const status = category?.status || (category?.is_active === false ? "inactive" : "active");
  const isActive = category?.is_active ?? status !== "inactive";
  return {
    ...category,
    id: safeId,
    name: safeName,
    slug: category?.slug || slugify(safeName),
    image: category?.image || category?.image_url || "",
    parent_id: category?.parent_id ?? category?.parentId ?? null,
    status,
    is_active: isActive,
  };
};

export const buildCategoryTree = (categories = []) => {
  const normalized = (Array.isArray(categories) ? categories : [])
    .map((category) => normalizeCategoryRecord(category))
    .filter((category) => category.name);

  const byId = new Map(normalized.map((category) => [String(category.id), category]));
  const roots = [];
  const childrenMap = new Map();

  normalized.forEach((category) => {
    if (category.parent_id) {
      const parentKey = String(category.parent_id);
      if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
      childrenMap.get(parentKey).push(category);
    } else {
      roots.push(category);
    }
  });

  const attachChildren = (node) => {
    const children = childrenMap.get(String(node.id)) || [];
    return {
      ...node,
      children: children
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(attachChildren),
    };
  };

  return roots
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(attachChildren);
};

export const getMainCategories = (categories = []) => {
  const normalized = (Array.isArray(categories) ? categories : [])
    .map((category) => normalizeCategoryRecord(category))
    .filter((category) => category.name && !category.parent_id);
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
};

export const getSubCategories = (categories = [], parentId) => {
  const normalized = (Array.isArray(categories) ? categories : [])
    .map((category) => normalizeCategoryRecord(category))
    .filter((category) => category.name && String(category.parent_id) === String(parentId));
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
};

export const getCategoryBreadcrumb = (category, categories = []) => {
  const normalizedCategory = normalizeCategoryRecord(category);
  if (!normalizedCategory.name) return [];
  const tree = buildCategoryTree(categories);
  const findNode = (nodes, targetId) => {
    for (const node of nodes) {
      if (String(node.id) === String(targetId)) return node;
      const childMatch = findNode(node.children || [], targetId);
      if (childMatch) return childMatch;
    }
    return null;
  };
  const match = findNode(tree, normalizedCategory.id);
  if (!match) return [normalizedCategory.name];
  const breadcrumb = [];
  const walk = (node) => {
    breadcrumb.push(node.name);
    if (node.parent_id) {
      const parent = findNode(tree, node.parent_id);
      if (parent) walk(parent);
    }
  };
  walk(match);
  return breadcrumb.reverse();
};

export const getCategoryDisplayLabel = (mainCat, subCat) => {
  if (!mainCat && !subCat) return "";
  if (mainCat && subCat) return `${mainCat} → ${subCat}`;
  return mainCat || subCat || "";
};

export const getCategoryReference = (category, subcategory) => {
  if (!category) return "";
  if (!subcategory) return category;
  return `${category} → ${subcategory}`;
};
