#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Build the project using Typescript"

import { Ctx, pnpm, task, ts } from "./common.ts";

export const build = task("Build project", async (ctx) => {
  await pnpm.install(ctx);
  await ts.run(ctx);
});

if (import.meta.main) {
  Ctx.run(build);
}
