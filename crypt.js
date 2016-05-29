//crypt.js
/**
 *  Module for encrypting and decrypting strings.
 * @module crypt
 * @author Bram van der Veen <96aa48@gmail.com>
 */

//Import first-party modules.
var crypto = require('crypto');

//Set local variables.
var passwd = ":;\"dy5\"[W{6u8ZvsY8EdB/=2fpG\$atQ";

/**
 * Function for encrypting a string.
 * @param {String} str - String that you want to encrypt.
 * @return {String} arr - Encrypted string.
 */
function encrypt(str) {
	var cipher = crypto.createCipher('aes192', passwd);
	var arr = [];

	arr.push(cipher.update(str, 'utf8', 'hex'));
	arr.push(cipher.final('hex'));

	return arr.join('');
}

/**
 * Function to decrypt a string.
 * @param {String} str - String you want to decrypt
 * @return {String} The decrypted string.
 */
function decrypt(str) {
	var decipher = crypto.createDecipher('aes192', passwd);
	var arr = [];

	try {
		arr.push(decipher.update(str, 'hex', 'utf8'));
		arr.push(decipher.final('utf8'));

		return arr.join('');
	}
	catch (err) {
		return arr.join('');
	}
}

//Export the functions as a module.
module.exports = {
	'encrypt': encrypt,
	'decrypt': decrypt
}
