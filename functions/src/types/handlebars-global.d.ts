import type * as HandlebarsTypes from "handlebars";

declare global {
  // Genkit expects a global namespace called "Handlebars"
  namespace Handlebars {
    type HelperDelegate = HandlebarsTypes.HelperDelegate;
  }
}

export {};
