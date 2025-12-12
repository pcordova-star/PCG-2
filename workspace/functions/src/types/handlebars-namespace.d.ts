import "handlebars";

declare global {
  // Genkit expects a global namespace called "Handlebars"
  // We bind it to the module types without redefining individual types.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Handlebars {}
}

export {};
