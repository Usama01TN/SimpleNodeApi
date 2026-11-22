function validatePassword(password) {
    const passwordRegex = /^[A-Za-z\d@$!%*?&]{8,}$/;
    return typeof password === 'string' && passwordRegex.test(password);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
}

module.exports = { validatePassword, validateEmail };