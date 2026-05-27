const ALLOWED_ROLES = ['agent', 'counsellor', 'qa_officer', 'admission_officer'];

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function normalizeRole(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function requireRole(...allowedRoles) {
  return function roleMiddleware(req, _res, next) {
    const role = normalizeRole(req.header('X-Role'));
    if (!role) {
      return next(makeError(401, 'ROLE_REQUIRED', 'X-Role header is required'));
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return next(
        makeError(403, 'INVALID_ROLE', 'Role is not supported', {
          supportedRoles: ALLOWED_ROLES,
        })
      );
    }

    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return next(makeError(403, 'ROLE_FORBIDDEN', 'Role is not allowed for this endpoint'));
    }

    req.role = role;
    req.agentId = typeof req.header('X-Agent-Id') === 'string' ? req.header('X-Agent-Id').trim() : '';
    next();
  };
}

module.exports = {
  ALLOWED_ROLES,
  normalizeRole,
  requireRole,
};
