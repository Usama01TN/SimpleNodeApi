// Backwards-compatible middleware name used by existing route files.
// The shared middleware now verifies the JWT signature and database revocation state.
module.exports = require('./auth.middleware').authMiddleware;
