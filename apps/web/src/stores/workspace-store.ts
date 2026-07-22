import { create } from "zustand";

interface Workspace {
	id: string;
	name: string;
	type: "personal" | "team";
}

interface WorkspaceState {
	workspaces: Workspace[];
	activeWorkspaceId: string | null;
	setWorkspaces: (workspaces: Workspace[]) => void;
	setActiveWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
	workspaces: [],
	activeWorkspaceId: null,

	setWorkspaces: (workspaces) => set({ workspaces }),
	setActiveWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId }),
}));
