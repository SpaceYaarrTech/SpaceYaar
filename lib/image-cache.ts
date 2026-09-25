const imagePromises = new Map<string, Promise<void>>();

export function preloadImage(source: string): Promise<void> {
  const cachedImage = imagePromises.get(source);
  if (cachedImage) return cachedImage;

  const imagePromise = new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to preload image: ${source}`));
    image.src = source;
  }).catch(() => undefined);

  imagePromises.set(source, imagePromise);
  return imagePromise;
}

export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(preloadImage));
}