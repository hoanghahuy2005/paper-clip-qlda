import { approvals, companyMemberships, instanceUserRoles, issueApprovals, issues, type Db } from "@paperclipai/db";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { isUuidLike } from "@paperclipai/shared";
import { approvalReadSqlCondition, issueReadSqlCondition, type AuthorizationActor } from "./authorization.js";

const maxMeetingMs = 60 * 60 * 1000;
type Meeting = {
  id:string; companyId:string; organizerId:string; participantIds:string[];
  state:"started"|"ended"|"cancelled"; startedAt:string; expiresAt:string;
};

// A normal Paperclip approval is the authority source. The request payload
// describes the proposed meeting but cannot attest who organized it.
export async function readOfficeMeetings(db: Db, actor: AuthorizationActor, companyId: string, roster: string[]): Promise<Meeting[]> {
  const now = Date.now();
  const authority = or(
    actor.source === "local_implicit" ? eq(approvals.decidedByUserId, "local-board") : undefined,
    sql`exists (select 1 from ${instanceUserRoles}
      where ${instanceUserRoles.userId} = ${approvals.decidedByUserId} and ${instanceUserRoles.role} = 'instance_admin')`,
    sql`exists (select 1 from ${companyMemberships}
      where ${companyMemberships.companyId} = ${approvals.companyId}
      and ${companyMemberships.principalType} = 'user'
      and ${companyMemberships.principalId} = ${approvals.decidedByUserId}
      and ${companyMemberships.status} = 'active'
      and ${companyMemberships.membershipRole} = 'owner')`,
  );
  const rows = await db.select({
    id: approvals.id, organizerId: approvals.decidedByUserId, startedAt: approvals.decidedAt,
    issueId: issues.id, issueStatus: issues.status, payload: approvals.payload,
  }).from(approvals).innerJoin(issueApprovals, and(
    eq(approvals.id, issueApprovals.approvalId), eq(issueApprovals.companyId, companyId),
  )).innerJoin(issues, and(eq(issues.id, issueApprovals.issueId), eq(issues.companyId, companyId)))
    .where(and(eq(approvals.companyId, companyId), eq(approvals.type, "request_board_approval"),
      eq(approvals.status, "approved"), gte(approvals.decidedAt, new Date(now-maxMeetingMs)),
      authority,
      sql`jsonb_typeof(${approvals.payload}->'officeMeeting') = 'object'`,
      await issueReadSqlCondition(db, actor), await approvalReadSqlCondition(db, actor)))
    .orderBy(desc(approvals.decidedAt)).limit(30);
  const ids = new Set(roster);
  const result: Meeting[] = [];
  let roomTaken = false;
  // The Office has one meeting room. A recent, authorized intent wins.
  for (const row of rows) {
    const value = row.payload.officeMeeting;
    if (!value || typeof value!=="object" || Array.isArray(value)) continue;
    const intent = value as Record<string, unknown>;
    if (intent.issueId!==row.issueId || !Array.isArray(intent.participantIds) ||
      typeof intent.expiresAt!=="string" || !row.organizerId || !row.startedAt) continue;
    const participantIds = intent.participantIds.filter((id): id is string =>
      typeof id==="string" && isUuidLike(id) && ids.has(id));
    if (participantIds.length<2 || participantIds.length>3 || participantIds.length!==intent.participantIds.length ||
      new Set(participantIds).size!==participantIds.length) continue;
    const expires = Date.parse(intent.expiresAt), start = row.startedAt.getTime();
    if (!Number.isFinite(expires) || start>now || expires<=start || expires>start+maxMeetingMs) continue;
    const state = row.issueStatus==="cancelled" ? "cancelled"
      : row.issueStatus==="done" || expires<=now ? "ended" : "started";
    if (state==="started" && roomTaken) continue;
    if (state==="started") roomTaken=true;
    result.push({id:row.id, companyId, organizerId:row.organizerId, participantIds,
      state, startedAt:row.startedAt.toISOString(), expiresAt:new Date(expires).toISOString()});
  }
  return result;
}
