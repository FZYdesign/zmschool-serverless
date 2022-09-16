const crypto = require("crypto");

const cipher = crypto.createCipheriv('aes-128-ecb', key, iv);