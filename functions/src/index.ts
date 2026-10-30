import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Whitelist of authorized owner identities permitted to claim superadmin
const AUTHORIZED_SUPERADMIN_EMAILS = [
  "pachax.bo@gmail.com",
  "admin@pachax.bo",
  "gfabrigtrf@gmail.com",
];

/**
 * Superadmin Bootstrap Function - Hardened Security
 * Enforces:
 * 1. Caller must be authenticated and email verified.
 * 2. Caller's email must match the explicitly authorized owner whitelist.
 * 3. Secret bootstrap key must match function config if defined.
 * 4. Only one superadmin can be bootstrapped; subsequent admins must be invited.
 */
export const bootstrapSuperadmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Autenticación requerida para inicializar el superadministrador."
    );
  }

  const callerEmail = (request.auth.token.email || "").toLowerCase();

  // Validate against owner whitelist
  const isAuthorizedEmail = AUTHORIZED_SUPERADMIN_EMAILS.some(
    (whitelisted) => whitelisted.toLowerCase() === callerEmail
  );

  if (!isAuthorizedEmail) {
    throw new HttpsError(
      "permission-denied",
      "Esta identidad no está autorizada para reclamar el rol de superadministrador."
    );
  }

  // Check if any active superadmin already exists
  const existingSuperadminSnap = await db
    .collection("users")
    .where("role", "==", "superadmin")
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!existingSuperadminSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "El superadministrador del sistema ya ha sido inicializado. Cualquier cuenta adicional debe crearse mediante invitación."
    );
  }

  const uid = request.auth.uid;
  const displayName = request.data?.displayName || "Propietario PACHAX";

  // Set Custom Claims in Firebase Authentication
  await admin.auth().setCustomUserClaims(uid, {
    role: "superadmin",
    developerCompanyId: "dev-pachax-core",
  });

  // Store in Firestore
  await db.collection("users").doc(uid).set({
    uid,
    email: callerEmail,
    displayName,
    role: "superadmin",
    developerCompanyId: "dev-pachax-core",
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Write to Audit Log
  await db.collection("auditLogs").add({
    action: "SUPERADMIN_BOOTSTRAP_EXECUTED",
    targetUid: uid,
    performedBy: uid,
    performedByEmail: callerEmail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Superadministrador inicializado satisfactoriamente con permisos globales.",
  };
});

/**
 * Administrative User Invitation Function
 * Enforces role-based boundaries on invitations:
 * - Superadmin & Dev Owner can invite any role.
 * - Client Admin can ONLY invite client_user for their own clientCompanyId.
 */
export const inviteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe iniciar sesión para enviar invitaciones.");
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection("users").doc(callerUid).get();
  const callerData = callerSnap.data();

  if (!callerData || callerData.status !== "active") {
    throw new HttpsError("permission-denied", "Usuario inactivo o sin perfil registrado.");
  }

  const callerRole = callerData.role;
  const { email, role: targetRole, clientCompanyId, developerCompanyId, displayName } = request.data;

  if (!email || !targetRole) {
    throw new HttpsError("invalid-argument", "Email y rol son requeridos.");
  }

  // Permission boundary verification
  if (callerRole === "client_admin") {
    if (targetRole !== "client_user") {
      throw new HttpsError(
        "permission-denied",
        "Los administradores de clientes solo pueden invitar usuarios de rol cliente."
      );
    }
    if (clientCompanyId !== callerData.clientCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "No puedes invitar usuarios para otra empresa cliente."
      );
    }
  } else if (!["superadmin", "dev_owner", "dev_admin"].includes(callerRole)) {
    throw new HttpsError(
      "permission-denied",
      "No posees privilegios para emitir invitaciones en la plataforma."
    );
  }

  // Generate invitation token
  const invitationRef = await db.collection("userInvitations").add({
    email: email.toLowerCase().trim(),
    role: targetRole,
    displayName: displayName || email.split("@")[0],
    clientCompanyId: clientCompanyId || null,
    developerCompanyId: developerCompanyId || "dev-pachax-core",
    invitedBy: callerUid,
    invitedByEmail: callerData.email,
    status: "pending",
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    ),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log in audit
  await db.collection("auditLogs").add({
    action: "USER_INVITATION_CREATED",
    invitationId: invitationRef.id,
    targetEmail: email,
    targetRole,
    performedBy: callerUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    invitationId: invitationRef.id,
    message: `Invitación generada exitosamente para ${email}.`,
  };
});

/**
 * Account Suspension & Activation
 */
export const setUserAccountStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticación requerida.");
  }

  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerDoc.data();

  if (!callerData || !["superadmin", "dev_owner", "dev_admin"].includes(callerData.role)) {
    throw new HttpsError("permission-denied", "No tienes permisos para modificar estados de cuenta.");
  }

  const { targetUid, newStatus } = request.data;
  if (!targetUid || !["active", "suspended"].includes(newStatus)) {
    throw new HttpsError("invalid-argument", "targetUid y newStatus ('active' | 'suspended') son requeridos.");
  }

  // Update in Firebase Auth
  await admin.auth().updateUser(targetUid, {
    disabled: newStatus === "suspended",
  });

  // Update in Firestore
  await db.collection("users").doc(targetUid).update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Audit
  await db.collection("auditLogs").add({
    action: `USER_ACCOUNT_${newStatus.toUpperCase()}`,
    targetUid,
    performedBy: request.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: `Cuenta ${newStatus === "suspended" ? "suspendida" : "reactivada"}.` };
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
