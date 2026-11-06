import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { dispatchCriticalIncidentAlert } from "./notifications";

admin.initializeApp();
const db = admin.firestore();

// Hierarchy rank for role comparison
const ROLE_RANKS: Record<string, number> = {
  superadmin: 100,
  dev_owner: 80,
  dev_admin: 60,
  dev_commercial: 40,
  dev_engineer: 40,
  client_admin: 20,
  client_user: 10,
};

/**
 * Helper to calculate operational date string (YYYY-MM-DD) in America/La_Paz (UTC-4)
 */
function getOperationalDayString(date: Date = new Date(), timeZone: string = "America/La_Paz"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Returns YYYY-MM-DD
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Deterministic, tenant-scoped idempotency key generator
 */
function getTenantIdempotencyDocId(clientCompanyId: string, projectId: string, rawKey: string): string {
  const hash = crypto.createHash("sha256").update(`${clientCompanyId}:${projectId}:${rawKey}`).digest("hex").substring(0, 32);
  return `${clientCompanyId}_${projectId}_${hash}`;
}

/**
 * 1. Administrative User Invitation Function
 * Multi-tenant safe:
 * - Superadmin can invite any role in any company.
 * - Dev Admin / Owner can only invite users for their own developerCompanyId.
 * - Client Admin can ONLY invite client_user for their own clientCompanyId.
 * - Generates a secure single-use cryptographic token, hashes it with SHA-256,
 *   and sets 48-hour expiration.
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
  const callerRank = ROLE_RANKS[callerRole] || 0;
  const { email, role: targetRole, clientCompanyId, developerCompanyId, displayName } = request.data;

  if (!email || !targetRole) {
    throw new HttpsError("invalid-argument", "Email y rol son requeridos.");
  }

  const targetRank = ROLE_RANKS[targetRole] || 0;
  if (!targetRank) {
    throw new HttpsError("invalid-argument", `El rol solicitado '${targetRole}' no es válido.`);
  }

  // Hierarchy rule: Caller cannot invite a role with greater or equal rank (unless superadmin)
  if (callerRole !== "superadmin" && targetRank >= callerRank) {
    throw new HttpsError(
      "permission-denied",
      "No tienes autorización para asignar un rol de igual o superior jerarquía."
    );
  }

  // Multi-tenant isolation rule
  let finalDevCompanyId = developerCompanyId;
  let finalClientCompanyId = clientCompanyId || null;

  if (callerRole === "client_admin") {
    if (targetRole !== "client_user") {
      throw new HttpsError(
        "permission-denied",
        "Los administradores de clientes solo pueden invitar usuarios de rol cliente."
      );
    }
    // Strict client isolation
    finalClientCompanyId = callerData.clientCompanyId;
    finalDevCompanyId = callerData.developerCompanyId;
  } else if (["dev_owner", "dev_admin"].includes(callerRole)) {
    // Developer admin can only invite within their own developerCompanyId
    finalDevCompanyId = callerData.developerCompanyId;

    if (finalClientCompanyId) {
      // Verify that this client company actually belongs to the caller's developerCompanyId
      const clientDoc = await db.collection("clientCompanies").doc(finalClientCompanyId).get();
      if (!clientDoc.exists || clientDoc.data()?.developerCompanyId !== finalDevCompanyId) {
        throw new HttpsError(
          "permission-denied",
          "La empresa cliente indicada no pertenece a su desarrolladora."
        );
      }
    }
  } else if (callerRole !== "superadmin") {
    throw new HttpsError(
      "permission-denied",
      "No posees privilegios para emitir invitaciones en la plataforma."
    );
  }

  // Generate cryptographic single-use token (32 random bytes)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const normalizedEmail = email.toLowerCase().trim();

  // Save invitation in Firestore
  const invitationRef = await db.collection("userInvitations").add({
    email: normalizedEmail,
    role: targetRole,
    displayName: displayName || normalizedEmail.split("@")[0],
    clientCompanyId: finalClientCompanyId,
    developerCompanyId: finalDevCompanyId,
    tokenHash,
    invitedBy: callerUid,
    invitedByEmail: callerData.email,
    status: "pending",
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    ),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    usedAt: null,
    usedByUid: null,
  });

  // Audit Log
  await db.collection("auditLogs").add({
    action: "USER_INVITATION_CREATED",
    invitationId: invitationRef.id,
    targetEmail: normalizedEmail,
    targetRole,
    developerCompanyId: finalDevCompanyId,
    clientCompanyId: finalClientCompanyId,
    performedBy: callerUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    invitationId: invitationRef.id,
    token: rawToken, // Provided to caller to transmit via secure invite link
    message: `Invitación generada exitosamente para ${normalizedEmail}.`,
  };
});

/**
 * 2. Accept User Invitation Function
 * Securely redeems a single-use invitation token:
 * - Checks status is "pending".
 * - Compares SHA-256 hash.
 * - Checks expiration.
 * - Atomically marks invitation as "accepted" in transaction.
 * - Applies Custom Claims strictly after successful transaction to prevent inconsistent states.
 */
export const acceptInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe iniciar sesión para aceptar una invitación.");
  }

  const { invitationId, token } = request.data;
  if (!invitationId || !token) {
    throw new HttpsError("invalid-argument", "invitationId y token son obligatorios.");
  }

  const callerUid = request.auth.uid;
  const callerEmail = (request.auth.token.email || "").toLowerCase().trim();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitationRef = db.collection("userInvitations").doc(invitationId);
  let resolvedInviteData: any = null;

  // 1. Transactional reservation and verification
  await db.runTransaction(async (transaction) => {
    const inviteDoc = await transaction.get(invitationRef);
    if (!inviteDoc.exists) {
      throw new HttpsError("not-found", "La invitación especificada no existe.");
    }

    const inviteData = inviteDoc.data()!;
    if (inviteData.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        `Esta invitación ya no es válida (estado: ${inviteData.status}).`
      );
    }

    // Verify token hash
    if (inviteData.tokenHash !== tokenHash) {
      throw new HttpsError("permission-denied", "El token de invitación es inválido o ha sido alterado.");
    }

    // Verify expiration
    const now = admin.firestore.Timestamp.now();
    if (inviteData.expiresAt.toMillis() < now.toMillis()) {
      transaction.update(invitationRef, { status: "expired" });
      throw new HttpsError("deadline-exceeded", "La invitación ha expirado.");
    }

    // Verify recipient email matches
    if (inviteData.email.toLowerCase() !== callerEmail) {
      throw new HttpsError(
        "permission-denied",
        `Esta invitación fue emitida para ${inviteData.email}, no para ${callerEmail}.`
      );
    }

    // Mark invitation accepted (single-use guarantee)
    transaction.update(invitationRef, {
      status: "accepted",
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      usedByUid: callerUid,
    });

    // Create or update user profile
    const userRef = db.collection("users").doc(callerUid);
    transaction.set(
      userRef,
      {
        uid: callerUid,
        email: callerEmail,
        displayName: inviteData.displayName || callerEmail.split("@")[0],
        role: inviteData.role,
        developerCompanyId: inviteData.developerCompanyId,
        clientCompanyId: inviteData.clientCompanyId,
        status: "active",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Audit Log
    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: "USER_INVITATION_ACCEPTED",
      invitationId,
      userUid: callerUid,
      email: callerEmail,
      role: inviteData.role,
      developerCompanyId: inviteData.developerCompanyId,
      clientCompanyId: inviteData.clientCompanyId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    resolvedInviteData = inviteData;
  });

  // 2. Set Custom Claims strictly AFTER successful transaction commit
  await admin.auth().setCustomUserClaims(callerUid, {
    role: resolvedInviteData.role,
    developerCompanyId: resolvedInviteData.developerCompanyId,
    clientCompanyId: resolvedInviteData.clientCompanyId,
  });

  return {
    success: true,
    role: resolvedInviteData.role,
    developerCompanyId: resolvedInviteData.developerCompanyId,
    clientCompanyId: resolvedInviteData.clientCompanyId,
    message: "Invitación aceptada y cuenta vinculada exitosamente.",
  };
});

/**
 * 3. Account Suspension & Activation
 * Hardened with:
 * - Anti-self-suspension check.
 * - Strict role hierarchy (lower cannot suspend equal or higher).
 * - Multi-tenant isolation (dev admins cannot touch users outside their tenant).
 * - Protection of the last active superadmin.
 * - Full audit trail.
 */
export const setUserAccountStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticación requerida.");
  }

  const callerUid = request.auth.uid;
  const { targetUid, newStatus } = request.data;

  if (!targetUid || !["active", "suspended"].includes(newStatus)) {
    throw new HttpsError("invalid-argument", "targetUid y newStatus ('active' | 'suspended') son requeridos.");
  }

  // Prevent accidental self-suspension
  if (callerUid === targetUid) {
    throw new HttpsError("invalid-argument", "No puedes modificar el estado de tu propia cuenta.");
  }

  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.status !== "active") {
    throw new HttpsError("permission-denied", "Usuario inactivo o sin perfil registrado.");
  }

  const callerRole = callerData.role;
  const callerRank = ROLE_RANKS[callerRole] || 0;

  const targetDoc = await db.collection("users").doc(targetUid).get();
  if (!targetDoc.exists) {
    throw new HttpsError("not-found", "El usuario objetivo no existe.");
  }

  const targetData = targetDoc.data()!;
  const targetRole = targetData.role;
  const targetRank = ROLE_RANKS[targetRole] || 0;

  // Hierarchy check: Caller must strictly outrank target
  if (callerRole !== "superadmin" && callerRank <= targetRank) {
    throw new HttpsError(
      "permission-denied",
      "No posees autorización para modificar una cuenta de igual o superior jerarquía."
    );
  }

  // Multi-tenant boundary check: Non-superadmins can only modify users within their developer tenant
  if (callerRole !== "superadmin") {
    if (targetData.developerCompanyId !== callerData.developerCompanyId) {
      throw new HttpsError(
        "permission-denied",
        "No puedes suspender usuarios de otra empresa desarrolladora."
      );
    }
  }

  // Last active superadmin protection
  if (targetRole === "superadmin" && newStatus === "suspended") {
    const activeSuperadminsSnap = await db
      .collection("users")
      .where("role", "==", "superadmin")
      .where("status", "==", "active")
      .get();

    if (activeSuperadminsSnap.size <= 1) {
      throw new HttpsError(
        "failed-precondition",
        "Operación rechazada: No es posible suspender al único superadministrador activo del sistema."
      );
    }
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

  // Audit Log
  await db.collection("auditLogs").add({
    action: `USER_ACCOUNT_${newStatus.toUpperCase()}`,
    targetUid,
    targetEmail: targetData.email,
    targetRole,
    performedBy: callerUid,
    performedByEmail: callerData.email,
    developerCompanyId: targetData.developerCompanyId || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: `Cuenta de ${targetData.email} ${newStatus === "suspended" ? "suspendida" : "reactivada"}.`,
  };
});

/**
 * 4. Check Daily Quota for General Incidents (Pre-check)
 */
export const checkDailyGeneralQuota = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe iniciar sesión para verificar la cuota.");
  }

  const { clientCompanyId } = request.data;
  if (!clientCompanyId) {
    throw new HttpsError("invalid-argument", "clientCompanyId es requerido.");
  }

  const operationalDay = getOperationalDayString();
  const quotaDocRef = db.collection("dailyQuotas").doc(`${clientCompanyId}_${operationalDay}`);
  const quotaDoc = await quotaDocRef.get();

  const countToday = quotaDoc.exists ? (quotaDoc.data()?.count || 0) : 0;
  const limitReached = countToday >= 1;

  return {
    allowed: !limitReached,
    operationalDay,
    countToday,
    limit: 1,
    resetsAt: `${operationalDay}T23:59:59.999-04:00`,
  };
});

/**
 * 5. Atomic General Incident Batch Submission
 * Enforces transactional quota reservation and strictly tenant-isolated idempotency:
 * - Scoped idempotency per clientCompanyId + projectId + key.
 * - Re-execution by client A with key "k1" NEVER leaks data or reports from client B.
 * - Atomically reserves quota in `dailyQuotas/${clientCompanyId}_${operationalDay}`.
 */
export const submitGeneralIncidentBatch = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticación requerida para reportar incidencias.");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.status !== "active") {
    throw new HttpsError("permission-denied", "Usuario inactivo o no autorizado.");
  }

  const {
    clientCompanyId,
    developerCompanyId,
    projectId,
    title,
    items,
    dailyConsent,
    idempotencyKey,
  } = request.data;

  if (!clientCompanyId || !projectId || !items || !Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "clientCompanyId, projectId e items son obligatorios.");
  }

  // Tenant membership validation
  if (callerData.role !== "superadmin" && callerData.clientCompanyId !== clientCompanyId) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para reportar incidencias en nombre de otra empresa cliente."
    );
  }

  // Project validation
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "El proyecto especificado no existe.");
  }

  const projectData = projectDoc.data()!;
  if (projectData.clientCompanyId !== clientCompanyId) {
    throw new HttpsError("permission-denied", "El proyecto no pertenece a su empresa cliente.");
  }

  const effectiveDevCompanyId = projectData.developerCompanyId || developerCompanyId;
  const operationalDay = getOperationalDayString();
  const quotaDocId = `${clientCompanyId}_${operationalDay}`;
  const quotaDocRef = db.collection("dailyQuotas").doc(quotaDocId);

  // Tenant-Scoped Idempotency Record Reference
  const idempotencyDocId = idempotencyKey
    ? getTenantIdempotencyDocId(clientCompanyId, projectId, idempotencyKey)
    : null;
  const idempotencyDocRef = idempotencyDocId
    ? db.collection("idempotencyRecords").doc(idempotencyDocId)
    : null;

  // Pre-check idempotency outside transaction for fast replay
  if (idempotencyDocRef) {
    const existingKeyDoc = await idempotencyDocRef.get();
    if (existingKeyDoc.exists) {
      const existingData = existingKeyDoc.data()!;
      return {
        success: true,
        reportId: existingData.reportId,
        operationalDay,
        isIdempotentReplay: true,
        message: "Reporte general recuperado por clave de idempotencia.",
      };
    }
  }

  const reportId = `rep-gen-${Date.now().toString(36)}`;
  const reportRef = db.collection("incidentReports").doc(reportId);

  // Run atomic Firestore transaction
  await db.runTransaction(async (transaction) => {
    // 1. Double check idempotency inside transaction
    if (idempotencyDocRef) {
      const txKeyDoc = await transaction.get(idempotencyDocRef);
      if (txKeyDoc.exists) {
        return; // Already created by a concurrent request
      }
    }

    // 2. Check and reserve daily quota
    const quotaSnap = await transaction.get(quotaDocRef);
    if (quotaSnap.exists && (quotaSnap.data()?.count || 0) >= 1) {
      throw new HttpsError(
        "resource-exhausted",
        `Su empresa cliente ya ha alcanzado la cuota de 1 envío diario de incidencias generales para hoy (${operationalDay}).`
      );
    }

    // Reserve quota atomically
    transaction.set(
      quotaDocRef,
      {
        clientCompanyId,
        developerCompanyId: effectiveDevCompanyId,
        operationalDay,
        count: (quotaSnap.exists ? (quotaSnap.data()?.count || 0) : 0) + 1,
        lastReportId: reportId,
        reservedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Save idempotency record (strictly tenant-isolated)
    if (idempotencyDocRef) {
      transaction.set(idempotencyDocRef, {
        clientCompanyId,
        projectId,
        reportId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Create Report document
    transaction.set(reportRef, {
      id: reportId,
      clientCompanyId,
      developerCompanyId: effectiveDevCompanyId,
      projectId,
      projectName: projectData.name || "Proyecto",
      reportedBy: callerUid,
      reportedByEmail: callerData.email,
      category: "general",
      title: title || `Incidencias Generales - ${operationalDay}`,
      itemsCount: items.length,
      status: "received",
      dailySubmissionConsentConfirmed: Boolean(dailyConsent),
      idempotencyKey: idempotencyKey || null,
      operationalDay,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create each incident item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemId = `item-${reportId}-${i + 1}`;
      const itemRef = db.collection("incidentItems").doc(itemId);

      transaction.set(itemRef, {
        id: itemId,
        reportId,
        clientCompanyId,
        developerCompanyId: effectiveDevCompanyId,
        projectId,
        title: it.title,
        description: it.description,
        moduleAffected: it.moduleAffected || "General",
        originalImageUrl: it.originalImageUrl || null,
        annotatedImageUrl: it.annotatedImageUrl || null,
        annotations: it.annotations || [],
        evidenceFiles: it.evidenceFiles || [],
        status: "received",
        priority: it.priority || "medium",
        aiFixEligible: true,
        aiFixStatus: "not_started",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    success: true,
    reportId,
    itemsCount: items.length,
    operationalDay,
    message: "Reporte general consolidado registrado exitosamente.",
  };
});

/**
 * 6. Atomic Critical Incident Submission (24/7 SLA)
 * Hardened with:
 * - Client authentication & tenant boundary verification.
 * - Rate limiting: Max 5 critical incidents per hour per client to prevent flood attacks.
 * - String size restrictions: Title (max 200 chars), justification (20 to 2000 chars), description (max 5000 chars).
 * - Disallows injection of arbitrary administrative fields.
 * - Immediate audit log emission.
 */
export const submitCriticalIncident = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticación requerida para reportar incidencias críticas.");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.status !== "active") {
    throw new HttpsError("permission-denied", "Usuario inactivo o no autorizado.");
  }

  const {
    clientCompanyId,
    developerCompanyId,
    projectId,
    title,
    description,
    moduleAffected,
    criticalJustification,
    emergencyPhone,
    originalImageUrl,
    annotatedImageUrl,
    annotations,
    evidenceFiles,
    idempotencyKey,
  } = request.data;

  // Strict field presence & length checks
  if (!clientCompanyId || !projectId || !title || !criticalJustification || !description) {
    throw new HttpsError(
      "invalid-argument",
      "clientCompanyId, projectId, title, criticalJustification y description son obligatorios."
    );
  }

  if (typeof title !== "string" || title.trim().length < 5 || title.length > 200) {
    throw new HttpsError("invalid-argument", "El título debe tener entre 5 y 200 caracteres.");
  }

  if (typeof criticalJustification !== "string" || criticalJustification.trim().length < 20 || criticalJustification.length > 2000) {
    throw new HttpsError(
      "invalid-argument",
      "La justificación crítica debe describir detalladamente el bloqueo (entre 20 y 2000 caracteres)."
    );
  }

  if (typeof description !== "string" || description.length > 5000) {
    throw new HttpsError("invalid-argument", "La descripción técnica no debe exceder 5000 caracteres.");
  }

  // Tenant validation
  if (callerData.role !== "superadmin" && callerData.clientCompanyId !== clientCompanyId) {
    throw new HttpsError(
      "permission-denied",
      "No puedes reportar incidencias críticas para otra empresa cliente."
    );
  }

  // Project validation
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "El proyecto especificado no existe.");
  }

  const projectData = projectDoc.data()!;
  if (projectData.clientCompanyId !== clientCompanyId) {
    throw new HttpsError("permission-denied", "El proyecto no pertenece a su empresa cliente.");
  }

  const effectiveDevCompanyId = projectData.developerCompanyId || developerCompanyId;

  // Rate limiting per client per hour (max 5 critical incidents per hour)
  const hourWindow = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  const rateLimitRef = db.collection("rateLimits").doc(`${clientCompanyId}_crit_${hourWindow}`);

  // Idempotency check
  const idempotencyDocId = idempotencyKey
    ? getTenantIdempotencyDocId(clientCompanyId, projectId, idempotencyKey)
    : null;
  const idempotencyDocRef = idempotencyDocId
    ? db.collection("idempotencyRecords").doc(idempotencyDocId)
    : null;

  if (idempotencyDocRef) {
    const existingSnap = await idempotencyDocRef.get();
    if (existingSnap.exists) {
      return {
        success: true,
        reportId: existingSnap.data()!.reportId,
        isIdempotentReplay: true,
        message: "Incidencia crítica recuperada por clave de idempotencia.",
      };
    }
  }

  const reportId = `rep-crit-${Date.now().toString(36)}`;
  const itemId = `item-${reportId}-1`;
  const reportRef = db.collection("incidentReports").doc(reportId);
  const itemRef = db.collection("incidentItems").doc(itemId);

  await db.runTransaction(async (transaction) => {
    // 1. Rate limiting check
    const rateSnap = await transaction.get(rateLimitRef);
    const countThisHour = rateSnap.exists ? (rateSnap.data()?.count || 0) : 0;
    if (countThisHour >= 5) {
      throw new HttpsError(
        "resource-exhausted",
        "Límite de frecuencia: Se han reportado 5 incidencias críticas en esta hora. Si la parada persiste, contacte por teléfono directo al equipo de guardia."
      );
    }

    transaction.set(
      rateLimitRef,
      {
        clientCompanyId,
        hourWindow,
        count: countThisHour + 1,
        lastReportId: reportId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Reserve idempotency
    if (idempotencyDocRef) {
      transaction.set(idempotencyDocRef, {
        clientCompanyId,
        projectId,
        reportId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 3. Create incidentReport
    transaction.set(reportRef, {
      id: reportId,
      clientCompanyId,
      developerCompanyId: effectiveDevCompanyId,
      projectId,
      projectName: projectData.name || "Proyecto",
      reportedBy: callerUid,
      reportedByEmail: callerData.email,
      category: "critical",
      title: `[CRÍTICO] ${title.trim()}`,
      itemsCount: 1,
      status: "received",
      criticalJustification: criticalJustification.trim(),
      emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : null,
      idempotencyKey: idempotencyKey || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Create incidentItem
    transaction.set(itemRef, {
      id: itemId,
      reportId,
      clientCompanyId,
      developerCompanyId: effectiveDevCompanyId,
      projectId,
      title: title.trim(),
      description: `${description.trim()}\n\n[JUSTIFICACIÓN CRÍTICA: ${criticalJustification.trim()}]${emergencyPhone ? `\n[TELÉFONO DE CONTACTO: ${emergencyPhone}]` : ""}`,
      moduleAffected: moduleAffected || "Módulo Crítico",
      originalImageUrl: originalImageUrl || null,
      annotatedImageUrl: annotatedImageUrl || null,
      annotations: annotations || [],
      evidenceFiles: evidenceFiles || [],
      status: "received",
      priority: "urgent",
      aiFixEligible: true,
      aiFixStatus: "not_started",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Audit Log
    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: "CRITICAL_INCIDENT_DISPATCHED",
      reportId,
      clientCompanyId,
      developerCompanyId: effectiveDevCompanyId,
      projectId,
      reportedBy: callerUid,
      reportedByEmail: callerData.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Dispatch external notifications (Telegram / Email) if configured, or record internally
  const notificationResult = await dispatchCriticalIncidentAlert(db, {
    reportId,
    projectId,
    projectName: projectData.name || "Proyecto",
    clientCompanyId,
    developerCompanyId: effectiveDevCompanyId,
    reportedByEmail: callerData.email,
    title,
    criticalJustification,
    emergencyPhone,
    createdAt: new Date().toISOString(),
  });

  const notificationMessage =
    notificationResult.status === "delivered"
      ? "Incidencia crítica registrada con éxito. Notificaciones enviadas por Telegram y Correo al equipo de guardia."
      : notificationResult.status === "partial"
      ? "Incidencia crítica registrada con éxito. Notificación parcial enviada al equipo de guardia."
      : "Incidencia crítica registrada con éxito. Notificación archivada internamente en cola operativa (credenciales de mensajería externa no configuradas).";

  return {
    success: true,
    reportId,
    notificationStatus: notificationResult.status,
    message: notificationMessage,
  };
});
