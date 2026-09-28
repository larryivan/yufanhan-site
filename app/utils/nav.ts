/** The site's top-level pages, in menu order: one list for the header, its mobile menu and the error page. */
export const SITE_NAV = [
  { to: '/', label: 'Home' },
  { to: '/blog', label: 'Blog' },
  { to: '/life', label: 'Life' },
  { to: '/about', label: 'About' }
] as const
