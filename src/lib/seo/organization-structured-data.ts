import { site } from '@/app/tours/_lib/site';

const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

export const showtimeOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${LANDINGS_URL}/#organization`,
  name: 'ShowtimeProp',
  url: `${LANDINGS_URL}/`,
  logo: new URL(site.logo, LANDINGS_URL).toString(),
  email: 'info@showtimeprop.com',
};
