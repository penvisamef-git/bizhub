// only the AES parts of crypto-js (the full library was ~1/3 of the first download); same format as before
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";
import { LOGIN_STORAGE_KEY } from "../config";

// Saves the login (token + user) in localStorage, lightly encrypted.
// Note: anything in the browser can be read by the user; never store secrets here.
const ENCRYPTION_KEY = "bizhub-client";

// decrypting on every call was slow (it runs for each API request and many renders): keep the last result
let last = { encrypted: null, value: null };

class Auth {
  setClientLogin(userData) {
    const encrypted = this.encryptObject(userData);
    localStorage.setItem(LOGIN_STORAGE_KEY, encrypted);
    last = { encrypted, value: userData };
  }

  getClientLogin() {
    const encrypted = localStorage.getItem(LOGIN_STORAGE_KEY);
    if (!encrypted) return null;
    if (encrypted !== last.encrypted) last = { encrypted, value: this.decryptObject(encrypted) };
    return last.value;
  }

  removeClientLogin() {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    last = { encrypted: null, value: null };
  }

  encryptObject(object) {
    return AES.encrypt(JSON.stringify(object), ENCRYPTION_KEY).toString();
  }

  decryptObject(encryptedString) {
    try {
      const text = AES.decrypt(encryptedString, ENCRYPTION_KEY).toString(Utf8);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }
}

export const auth = new Auth();
export default Auth;
