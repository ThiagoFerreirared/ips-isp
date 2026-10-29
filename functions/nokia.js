export const COLLECTION = 'privateNokiaCredentials';
export const MIN_QUERY = 4;
export const RESULT_LIMIT = 20;

export function normalizeSerial(value) {
  return String(value).trim().toUpperCase().replace(/^SALCL/, 'ALCL');
}

export function validateQuery(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  const query = normalizeSerial(value);
  return /^[A-Z0-9]{4,32}$/.test(query) ? query : null;
}

// Private substring index: supports any part of the serial, without downloading the base.
export function serialTokens(serial) {
  const value = normalizeSerial(serial);
  const tokens = new Set();
  for (let i = 0; i <= value.length - MIN_QUERY; i++) {
    for (let j = i + MIN_QUERY; j <= value.length; j++) tokens.add(value.slice(i, j));
  }
  return [...tokens];
}

export function makeLookup({ db, ErrorType, now = Date.now }) {
  return async ({ auth, data }) => {
    if (!auth) throw new ErrorType('unauthenticated', 'Entre novamente para consultar.');
    if (auth.token.nokiaLookup !== true) {
      throw new ErrorType('permission-denied', 'Operador sem permissão para consulta Nokia.');
    }
    const query = validateQuery(data?.query);
    if (!query) throw new ErrorType('invalid-argument', 'Digite de 4 a 32 letras ou números.');

    // Shared across instances, per operator. Never log queries or returned secrets.
    const rateRef = db.collection('privateNokiaRateLimits').doc(auth.uid);
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(rateRef);
      const previous = snapshot.data();
      const time = now();
      const current = previous && time - previous.start < 60000;
      if (current && previous.count >= 60) {
        throw new ErrorType('resource-exhausted', 'Limite de consultas. Aguarde um minuto.');
      }
      tx.set(rateRef, { start: current ? previous.start : time, count: current ? previous.count + 1 : 1 });
    });

    const base = db.collection(COLLECTION);
    let snapshot = await base.where('normalizedSerial', '==', query).limit(RESULT_LIMIT + 1).get();
    if (snapshot.empty) {
      snapshot = await base.where('tokens', 'array-contains', query).limit(RESULT_LIMIT + 1).get();
    }
    return {
      results: snapshot.docs.slice(0, RESULT_LIMIT).map(doc => {
        const { serial, password, code } = doc.data();
        return { serial, password, code };
      }),
      truncated: snapshot.docs.length > RESULT_LIMIT,
    };
  };
}
