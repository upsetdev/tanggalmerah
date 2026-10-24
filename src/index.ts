import { handle } from "./app";

export default {
  fetch(req: Request): Response {
    return handle(req);
  },
} satisfies ExportedHandler;
