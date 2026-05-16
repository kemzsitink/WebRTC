import CryptoJS from "crypto-js";

/**
 * AES Decryption Utility
 * @param encryptData Data to decrypt
 * @param key Secret key (usually padCode)
 * @returns Decrypted string or null
 */
export function decryptAES(encryptData: string, key: string): string | null {
  try {
    const ciphertext = CryptoJS.enc.Base64.parse(encryptData);
    const stringEncryptData = CryptoJS.format.Hex.parse(ciphertext.toString());
    
    let keyFormat = key.padEnd(16, "0");
    if (keyFormat.length > 16) {
      keyFormat = keyFormat.slice(0, 16);
    }
    
    const keyValue = CryptoJS.enc.Utf8.parse(keyFormat);
    const decrypt = CryptoJS.AES.decrypt(stringEncryptData, keyValue, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    const source = CryptoJS.enc.Utf8.stringify(decrypt);
    return source;
  } catch (error) {
    console.error("AES Decryption error:", error);
    return null;
  }
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
