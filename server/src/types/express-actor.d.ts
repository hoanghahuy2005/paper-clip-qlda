import type { AgentApiKeyScope } from "@paperclipai/shared";
import "express-serve-static-core";

type Membership = { companyId: string; membershipRole?: string | null; status?: string };

declare global {
  namespace Express {
    interface Request {
      actor: {
        type: "board" | "agent" | "none";
        source?: "local_implicit" | "session" | "board_key" | "agent_key" | "agent_jwt"
          | "mcp_oauth" | "cloud_tenant" | "cloud_control" | "none";
        userId?: string;
        userName?: string | null;
        userEmail?: string | null;
        sessionId?: string;
        companyId?: string;
        companyIds?: string[];
        memberships?: Membership[];
        onBehalfOfMemberships?: Membership[];
        isInstanceAdmin?: boolean;
        canManageExperimentalSettings?: boolean;
        agentId?: string;
        keyId?: string;
        keyScope?: AgentApiKeyScope | null;
        runId?: string;
        identityContextId?: string | null;
        onBehalfOfUserId?: string | null;
        authorizingUserId?: string | null;
      };
    }
  }
}
