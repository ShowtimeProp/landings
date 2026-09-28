/**
 * JSON-LD de tours.showtimeprop.com: la organización, el servicio con sus
 * precios públicos y las preguntas frecuentes visibles en la página.
 */
import { content, pricing } from '@/app/tours/_lib/content';
import { site } from '@/app/tours/_lib/site';
import { showtimeOrganization } from './organization-structured-data';

const SERVICE_ID = `${site.url}/#service`;

function price(value: number, extra: Record<string, unknown> = {}) {
  return {
    '@type': extra.unitCode ? 'UnitPriceSpecification' : 'PriceSpecification',
    price: value,
    priceCurrency: pricing.currency,
    valueAddedTaxIncluded: false,
    ...extra,
  };
}

function offer(name: string, description: string, spec: Record<string, unknown>) {
  return {
    '@type': 'Offer',
    name,
    description,
    price: spec.price,
    priceCurrency: pricing.currency,
    priceSpecification: spec,
    availability: 'https://schema.org/InStock',
    url: `${site.url}/`,
  };
}

export function buildToursStructuredData() {
  const { '@context': _context, ...organization } = showtimeOrganization;
  void _context;
  const { tourBase, tourAereo, hosting } = pricing;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'Service',
        '@id': SERVICE_ID,
        name: 'Tours virtuales 360',
        serviceType: 'Tour virtual 360',
        description: content.hero.body,
        url: `${site.url}/`,
        provider: { '@id': organization['@id'] },
        areaServed: { '@type': 'Place', name: 'Mar del Plata y zona, Buenos Aires, Argentina' },
        audience: { '@type': 'BusinessAudience', name: 'Inmobiliarias y comercios' },
        offers: [
          offer(
            `Tour virtual 360 hasta ${tourBase.maxM2} m²`,
            `Producción del tour de una propiedad de hasta ${tourBase.maxM2} m². Más IVA.`,
            price(tourBase.price)
          ),
          offer(
            `Tour virtual 360 hasta ${tourAereo.maxM2} m² con tomas aéreas`,
            `Producción del tour de hasta ${tourAereo.maxM2} m² con tomas aéreas 360 con drone. Más IVA.`,
            price(tourAereo.price)
          ),
          offer(
            'Hosting del tour, mensual',
            `Primeros ${hosting.mesesSinCargo} meses sin cargo; después, por tour y por mes. Más IVA.`,
            price(hosting.mensual, { unitCode: 'MON', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } })
          ),
          offer(
            'Hosting del tour, anual',
            `Por tour y por año: ${hosting.mesesDeRegaloAnual} meses de regalo frente al pago mensual. Más IVA.`,
            price(hosting.anual, { unitCode: 'ANN', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'ANN' } })
          ),
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${site.url}/#faq`,
        mainEntity: content.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
        })),
      },
    ],
  };
}
