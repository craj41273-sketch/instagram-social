/**
 * Static export has no Cache Components runtime. The year is fixed at build
 * time, which is sufficient for the prerendered footer.
 */
export async function getCurrentYear(): Promise<number> {
  return new Date().getFullYear();
}
