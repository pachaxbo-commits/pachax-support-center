import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Superadmin Bootstrap Function
 * Can only be executed once when no superadmin exists in the system.
 */
export const bootstrapSuperadmin = onCall(async (request) => {
  // Check if any superadmin already exists
  const superadminsSnap = await db
    .collection("users")
    .where("role", "==", "superadmin")
    .limit(1)
    .get();

  if (!superadminsSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "A superadmin already exists. Manual invitation required."
    );
  }

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication is required to claim superadmin ownership."
    );
  }

  const { email, displayName } = request.data;
  const uid = request.auth.uid;

  // Set custom claims
  await admin.auth().setCustomUserClaims(uid, { role: "superadmin" });

  // Create user profile in Firestore
  await db.collection("users").doc(uid).set({
    uid,
    email: email || request.auth.token.email,
    displayName: displayName || "Super Administrator",
    role: "superadmin",
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Superadmin profile initialized successfully." };
});

/**
 * Validate Daily Quota for General Incidents
 * Enforces rule: 1 general incident batch per day per client.
 */
export const checkDailyGeneralQuota = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const clientCompanyId = request.data.clientCompanyId;
  if (!clientCompanyId) {
    throw new HttpsError("invalid-argument", "clientCompanyId is required.");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const snapshot = await db
    .collection("incidentReports")
    .where("clientCompanyId", "==", clientCompanyId)
    .where("category", "==", "general")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStart))
    .get();

  const countToday = snapshot.size;
  const limitReached = countToday >= 1;

  return {
    allowed: !limitReached,
    countToday,
    limit: 1,
    resetsAt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
});

/**
 * Critical Incident Alert Dispatcher
 * Triggered automatically whenever a new incident is created.
 * Dispatches emergency alerts via Telegram, Email, and WhatsApp.
 */
export const onIncidentCreated = onDocumentCreated(
  "incidentReports/{reportId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.category === "critical") {
      // In production: Send Telegram alert, transactional email & WhatsApp template
      console.log(`[EMERGENCY ALERT] Critical incident reported: ${event.params.reportId}`, {
        client: data.clientCompanyId,
        project: data.projectId,
        itemsCount: data.itemsCount,
      });

      // Write to audit log
      await db.collection("auditLogs").add({
        action: "CRITICAL_INCIDENT_REPORTED",
        entityId: event.params.reportId,
        entityType: "incidentReport",
        clientCompanyId: data.clientCompanyId,
        developerCompanyId: data.developerCompanyId,
        metadata: { title: data.title, itemsCount: data.itemsCount },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * AI Repair Trigger (Preparation for Cloud Tasks & Cloud Run Jobs)
 * Initiates the autonomous / delegated repair pipeline for a designated bug.
 */
export const triggerAiRepair = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Verify caller is developer staff or superadmin
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerSnap.data();
  if (!callerData || !["superadmin", "dev_owner", "dev_admin", "dev_engineer"].includes(callerData.role)) {
    throw new HttpsError("permission-denied", "Insufficient permissions to trigger AI repairs.");
  }

  const { incidentItemId, projectId, mode } = request.data;
  if (!incidentItemId || !projectId) {
    throw new HttpsError("invalid-argument", "incidentItemId and projectId are required.");
  }

  // Create an AI Repair Run document
  const runRef = await db.collection("aiRepairRuns").add({
    incidentItemId,
    projectId,
    triggeredBy: request.auth.uid,
    mode: mode || "manual", // 'manual' | 'delegated' | 'autonomous_authorized'
    status: "queued", // 'queued' | 'analyzing' | 'patching' | 'testing' | 'pr_created' | 'completed' | 'failed'
    logs: [
      {
        timestamp: new Date().toISOString(),
        stage: "queued",
        message: "AI Repair job enqueued. Preparing repository context...",
      },
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { runId: runRef.id, status: "queued" };
});
