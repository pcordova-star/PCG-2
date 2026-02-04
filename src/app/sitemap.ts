// src/app/sitemap.ts
import { MetadataRoute } from 'next';

/**
 * Genera el sitemap.xml para el sitio.
 * Este archivo es leído por los motores de búsqueda para descubrir e indexar las páginas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pcg-2.vercel.app';

  // Páginas estáticas principales de la web pública
  const staticRoutes = [
    '/',
    '/precios',
    '/terminos',
  ];

  const staticUrls = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: route === '/' ? 1 : 0.7, // La home es la más importante
  }));

  // Páginas SEO de módulos/funcionalidades clave
  const seoRoutes = [
    '/control-subcontratistas-ds44',
    // ...aquí se agregarían futuras páginas SEO a medida que se creen
  ];

  const seoUrls = seoRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const, // Se actualizan más seguido que las páginas estáticas
    priority: 0.9, // Muy alta prioridad, son páginas de conversión
  }));

  return [...staticUrls, ...seoUrls];
}
