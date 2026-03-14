import { runTransaction } from 'firebase/database';
import { dataRef } from './config';

/**
 * Wraps a Firebase runTransaction call with standard error handling.
 * The callback `fn` may throw to signal an abort with a meaningful message.
 * For functions that need to return extra data, use closures and spread the result:
 *
 *   let extra = null;
 *   const result = await withTransaction((current) => {
 *     extra = current.someField;
 *     return updatedData;
 *   }, 'Fallback error message');
 *   return result.success ? { ...result, extra } : result;
 */
export async function withTransaction(fn, fallbackErrorMsg) {
  try {
    await runTransaction(dataRef, fn);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message || fallbackErrorMsg };
  }
}
