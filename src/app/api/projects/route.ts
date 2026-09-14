import { z } from "zod";
import { actor } from "@/server/auth";
import { body, failure } from "@/server/http";
import { listProjects, createProject } from "@/server/store";
export async function GET(r: Request) {
  try {
    return Response.json(await listProjects(await actor(r)));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request) {
  try {
    const owner = await actor(r);
    const v = z
      .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().max(10000),
      })
      .parse(await body(r));
    return Response.json(await createProject(owner, v.name, v.description), {
      status: 201,
    });
  } catch (e) {
    return failure(e);
  }
}
