/**
 * Mengambil nilai dari objek berdasarkan path yang dipisahkan oleh titik.
 * @param {Object} obj - Objek yang akan diambil nilainya.
 * @param {string} path - Path ke properti yang akan diambil nilainya.
 * @returns {*} Nilai dari properti yang diakses atau undefined jika path tidak ditemukan.
 */
export function getValueFromObject(obj, path) {
  if (!obj || !path) {
    return undefined;
  }

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result.hasOwnProperty(key)) {
      result = result[key];
    } else {
      return undefined;
    }
  }

  return result;
}
