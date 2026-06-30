import LeadPortalAuthClient from '@/components/LeadPortalAuthClient';

export default async function LeadSignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query[key] = first;
  });

  return <LeadPortalAuthClient mode="signup" initialQuery={query} />;
}
