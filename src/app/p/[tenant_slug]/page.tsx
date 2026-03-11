import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent.showtimeprop.com";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
};

type PropertyItem = {
  id: string;
  name: string;
  slug?: string | null;
  property_type?: string | null;
  operation_type?: string | null;
  price?: number | null;
  currency?: string | null;
  tour_virtual_url?: string | null;
  images?: unknown[];
};

type ApiResponse = {
  status: "ok";
  tenant: Tenant;
  properties: PropertyItem[];
};

async function fetchPortfolio(tenantSlug: string): Promise<ApiResponse | null> {
  const url = `${BACKEND_URL}/api/properties/public/portfolio?tenant_slug=${encodeURIComponent(tenantSlug)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = (await res.json()) as ApiResponse;
  if (!data?.tenant?.slug || !Array.isArray(data?.properties)) return null;
  return data;
}

function getFirstImageUrl(images?: unknown[]): string | null {
  if (!images || images.length === 0) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first)
    return (first as { url?: string }).url ?? null;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug } = await params;
  const data = await fetchPortfolio(tenant_slug);
  if (!data) {
    return { title: "Portfolio no encontrado | ShowtimeProp" };
  }
  return {
    title: `Portfolio | ${data.tenant.name}`,
    description: `Propiedades de ${data.tenant.name}`,
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const data = await fetchPortfolio(tenant_slug);
  if (!data) notFound();

  const { tenant, properties } = data;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0c",
        color: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 20px 40px",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>{tenant.name}</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14, marginTop: 8 }}>
            Portfolio de propiedades
          </p>
        </div>

        {properties.length === 0 ? (
          <p style={{ color: "#71717a" }}>No hay propiedades publicadas.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {properties.map((p) => {
              const href = p.slug
                ? `/p/${tenant.slug}/${p.slug}`
                : `/p/${tenant.slug}/${p.id}`;
              const imgUrl = getFirstImageUrl(p.images);
              const priceStr =
                p.price != null
                  ? `${p.currency || "USD"} ${p.price.toLocaleString("es-AR")}`
                  : null;

              return (
                <Link
                  key={p.id}
                  href={href}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "16/10",
                      background: "#1a1a1c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#52525b", fontSize: 13 }}>
                        Sin imagen
                      </span>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <h2
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {p.name}
                    </h2>
                    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                      {p.property_type && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.08)",
                          }}
                        >
                          {p.property_type}
                        </span>
                      )}
                      {p.operation_type && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.08)",
                          }}
                        >
                          {p.operation_type}
                        </span>
                      )}
                    </div>
                    {priceStr && (
                      <p
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#e4e4e7",
                        }}
                      >
                        {priceStr}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
