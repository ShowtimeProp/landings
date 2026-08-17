export const site = {
  url: "https://tours.showtimeprop.com",
  whatsapp: "5492233544057", // instancia stp-showtimeprop-marketing
  logo: "/showtime-logo.png",
};

export function waLink(texto: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(texto)}`;
}

export type ClientCategory = "gimnasio" | "veterinaria" | "inmobiliaria" | "airbnb";

export type ClientTour = {
  label: string;
  url: string;
};

export type ShowcaseClient = {
  slug: string;
  nombre: string;
  categoria: ClientCategory;
  categoriaLabel: string;
  lugar: string;
  contacto: string;
  tours: ClientTour[];
};

export const showcaseClients: ShowcaseClient[] = [
  {
    slug: "fortaleza-fit",
    nombre: "Fortaleza Fit",
    categoria: "gimnasio",
    categoriaLabel: "Gimnasio",
    lugar: "Mar de Cobo",
    contacto: "Gabriel y Mary",
    tours: [
      {
        label: "Fortaleza Fit",
        url: "https://tours.showtimeprop.com/comercios/gym/fortaleza-fit/index.htm",
      },
    ],
  },
  {
    slug: "cirfaglia-veterinaria",
    nombre: "Adrian Cirfaglia Veterinaria",
    categoria: "veterinaria",
    categoriaLabel: "Veterinaria",
    lugar: "Santa Clara del Mar",
    contacto: "Dr. Adrian Cirfaglia",
    tours: [
      {
        label: "Adrian Cirfaglia Veterinaria",
        url: "https://tours.showtimeprop.com/comercios/veterinaria/adrian-cirfaglia/index.htm",
      },
    ],
  },
  {
    slug: "remax-acqua",
    nombre: "RE/MAX Acqua",
    categoria: "inmobiliaria",
    categoriaLabel: "Bienes raíces",
    lugar: "Mar del Plata",
    contacto: "Romina Alejandra Remigio",
    tours: [
      {
        label: "Florida 52",
        url: "https://tours.showtimeprop.com/propiedades/remax/romina-remigio/florida-52/index.htm",
      },
      {
        label: "Toninas 1300",
        url: "https://tours.showtimeprop.com/propiedades/remax/romina-remigio/toninas-1300/index.htm",
      },
      {
        label: "Calle 20, Miramar",
        url: "https://tours.showtimeprop.com/propiedades/remax/romina-remigio/calle-20-miramar/index.htm",
      },
      {
        label: "San Luis 1890",
        url: "https://tours.showtimeprop.com/propiedades/remax/romina-remigio/san-luis-1890/index.htm",
      },
    ],
  },
  {
    slug: "remax-surf",
    nombre: "RE/MAX Surf",
    categoria: "inmobiliaria",
    categoriaLabel: "Bienes raíces",
    lugar: "Punta Mogotes",
    contacto: "Sebastián Acevedo",
    tours: [
      {
        label: "Médano Blanco",
        url: "https://tours.showtimeprop.com/propiedades/remax/sebastian-acevedo/medano-blanco/index.htm",
      },
      {
        label: "Colón 1550, piso 17",
        url: "https://tours.showtimeprop.com/propiedades/coldwell/sebastian-acevedo/colon-1550-17p/index.htm",
      },
      {
        label: "Ortega y Gasset 755",
        url: "https://tours.showtimeprop.com/propiedades/coldwell/sebastian-acevedo/ortega-y-gasset-755/index.htm",
      },
    ],
  },
  {
    slug: "dimeglio-propiedades",
    nombre: "Dimeglio Propiedades",
    categoria: "airbnb",
    categoriaLabel: "Airbnb",
    lugar: "Mar del Plata",
    contacto: "Bianca Nicolini",
    tours: [
      {
        label: "Palacio Cosmos",
        url: "https://tours.showtimeprop.com/propiedades/vacacional/palacio-cosmos-p6f/index.htm",
      },
      {
        label: "Juan A. Peña 5600",
        url: "https://tours.showtimeprop.com/propiedades/dimeglio/bianca-nicolini/juan-a-pena-5600-3/index.htm",
      },
    ],
  },
];

// Tour destacado del hero/demo: es el único cuya URL no nombra agencia ni
// persona, así que es el más seguro para mostrar en primer plano sin pedir
// autorización adicional.
export const demoTour = {
  url: "https://tours.showtimeprop.com/propiedades/vacacional/palacio-cosmos-p6f/index.htm",
  cliente: "Dimeglio Propiedades",
};
