import WorkspaceApp from "@/components/workspace-app";
import { localMode } from "@/server/store";
export default function Page() {
  return <WorkspaceApp localDev={localMode()} />;
}
