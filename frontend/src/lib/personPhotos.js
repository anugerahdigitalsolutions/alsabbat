/** Foto orang (pemain/staf): galeri jika ada, fallback ke foto lama (backward compatible). */
export const personPhotos = (person) => {
  const gallery = Array.isArray(person?.gallery_images) ? person.gallery_images.filter(Boolean) : [];
  if (gallery.length) return gallery.slice(0, 3);
  return person?.photo ? [person.photo] : [];
};

export default personPhotos;
