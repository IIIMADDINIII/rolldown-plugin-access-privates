#!/usr/bin/env -S deno run --node-modules-dir=none --no-lock --allow-all
//MISE description="Clean the project and build it using Typescript for CI"

import { clean } from "./clean.ts";
import { Ctx, pnpm, task } from "./common.ts";

export const buildCi = task("Build CI", async (ctx) => {
  await clean(ctx);
  await pnpm.install(ctx, { frozenLockfile: true });
  await ts.run(ctx);
});

if (import.meta.main) {
  Ctx.run(buildCi);
}
