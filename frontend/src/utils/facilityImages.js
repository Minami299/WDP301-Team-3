// Match the attraction detail gallery: facility images, then service photos.
export function getFacilityImageUrls(facility, assetOrigin) {
  const images = Array.isArray(facility.images) ? facility.images : [];
  const services = Array.isArray(facility.services) ? facility.services : [];
  const imageUrl = (image) => typeof image === 'string' ? image : image?.image_url;
  const candidates = [
    facility.primary_image,
    ...images.filter((image) => image?.is_primary === true).map(imageUrl),
    ...images.map(imageUrl),
    ...services.flatMap((service) => Array.isArray(service.photos) ? service.photos : []),
  ];
  const urls = [];
  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim()) continue;
    try {
      // Resolve relative paths against the API host, including when FE and API differ.
      const url = new URL(value.trim(), assetOrigin);
      if (['http:', 'https:'].includes(url.protocol) && !urls.includes(url.href)) {
        urls.push(url.href);
      }
    } catch {
      // Skip malformed entries and continue to the next available image.
    }
  }
  return urls;
}
