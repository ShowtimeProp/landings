import type { MetadataRoute } from 'next';

/**
 * robots.txt del dominio de landings.
 *
 * No declara `sitemap` porque acá conviven todos los tenants y cada uno tiene
 * el suyo en /p/{slug}/sitemap.xml. Cada inmobiliaria manda ese archivo a su
 * propia Search Console; poner un índice global significaría exponer la lista
 * completa de clientes de ShowtimeProp en un archivo público.
 *
 * Lo que se bloquea es lo que no tiene sentido en un buscador:
 *  - /api        endpoints internos.
 *  - /m/         landings por token de campaña: la URL lleva un token y cada
 *                visita indexada es tráfico atribuido mal.
 *  - /v/         resolvedor de slots de QR, que sólo redirige.
 *  - /n/         enlaces cortos, también redirecciones.
 *  - /perfil-lead  área privada del interesado (login y registro).
 *  - /vcard-file  descarga del .vcf, no es una página.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/m/', '/v/', '/n/', '/perfil-lead/', '/vcard-file/'],
      },
    ],
  };
}
