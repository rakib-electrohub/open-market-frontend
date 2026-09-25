import { apiClient } from "@/api/apiClient";

/**
 * Upload an image file, enforcing admin-configured max size.
 * Returns { file_url } on success, throws on error.
 */
export async function uploadImageWithSizeCheck(file, onError) {
  // Fetch admin-configured limit (default 2MB)
  let maxMb = 2;
  try {
    const settings = await apiClient.entities.SiteSettings.filter({ key: "max_image_size_mb" });
    if (settings.length > 0) maxMb = parseFloat(settings[0].value) || 2;
  } catch {}

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const msg = `Image too large. Maximum allowed size is ${maxMb} MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
    if (onError) onError(msg);
    throw new Error(msg);
  }

  const result = await apiClient.integrations.Core.UploadFile({ file });
  return result;
}

