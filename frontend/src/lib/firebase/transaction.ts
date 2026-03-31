import { runTransaction } from 'firebase/database';
import { dataRef } from './config';
import type { RawAppData, TransactionResult } from '@/types/domain';

export async function withTransaction(
  fn: (current: RawAppData | null) => RawAppData,
  fallbackErrorMsg: string,
): Promise<TransactionResult> {
  try {
    await runTransaction(dataRef, fn);
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackErrorMsg,
    };
  }
}
