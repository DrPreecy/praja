import { z } from "zod";
import { actor } from "@/server/auth";
import { body, failure } from "@/server/http";
import { readProject, mutateProject } from "@/server/store";
import { commandSchema } from "@/domain/model";
import { apply } from "@/domain/workspace";
type Params = { params: Promise<{ id: string }> };
export async function GET(r: Request, p: Params) {
  try {
    return Response.json(
      await readProject(await actor(r), z.uuid().parse((await p.params).id)),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request, p: Params) {
  try {
    const owner = await actor(r);
    const id = z.uuid().parse((await p.params).id);
    const cmd = commandSchema.parse(await body(r));
    return Response.json(
      await mutateProject(owner, id, (w) => apply(w, owner, cmd)),
    );
  } catch (e) {
    return failure(e);
  }
}
