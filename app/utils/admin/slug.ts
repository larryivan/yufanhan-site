/**
 * URL-safe names: a post's slug from its title, an upload's name from its file
 * name. Latin letters lose their accents; anything else (Chinese, emoji) is
 * dropped, so a title in Chinese gives no slug and one has to be typed.
 */
export const slugify = (text: string, max = 60) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')

/** Compressed files keep what is inside them in the name: `counts.tar.gz`, `calls.vcf.gz`. */
const COMPOUND = /\.((?:tar|fa|fasta|fna|fq|fastq|vcf|bed|gff|gff3|gtf|sam|csv|tsv|txt|json)\.(?:gz|bz2|xz))$/i

/** `photo.JPG` → `jpg`, `counts.tar.gz` → `tar.gz`. */
export const fileExtension = (name: string) =>
  (COMPOUND.exec(name)?.[1] ?? /\.([a-z0-9]{1,8})$/i.exec(name)?.[1] ?? '').toLowerCase()

/** `IMG_2041 (1).JPG` → `img-2041-1`: an upload's name without its extension. */
export const fileBase = (name: string, fallback: string) => {
  const extension = fileExtension(name)
  return slugify(extension ? name.slice(0, -(extension.length + 1)) : name, 40) || fallback
}
