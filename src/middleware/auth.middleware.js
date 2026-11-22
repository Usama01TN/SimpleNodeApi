const jwt = require('jsonwebtoken');
const RevokedToken = require('../models/RevokedToken');

exports.authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) return res.status(401).json({ message: 'Invalid authorization token.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const revoked = await RevokedToken.exists({ token });
    if (revoked) return res.status(401).json({ message: 'Your session has ended. Please sign in again.' });
    req.user = decoded;
    req.token = token;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Unable to verify your session right now.' });
  }
};

exports.adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  return next();
};

// Backwards-compatible export for older imports.
exports.revokedTokens = new Set();
