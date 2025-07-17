import Onyx from 'react-native-onyx';
import * as MergeTransaction from '@libs/actions/MergeTransaction';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {MergeTransaction as MergeTransactionType, Transaction, TransactionViolation} from '@src/types/onyx';
import createRandomMergeTransaction from '../utils/collections/mergeTransaction';
import createRandomTransaction from '../utils/collections/transaction';
import * as TestHelper from '../utils/TestHelper';
import type {MockFetch} from '../utils/TestHelper';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// Helper function to create mock violations
function createMockViolations(): TransactionViolation[] {
    return [
        {
            type: CONST.VIOLATION_TYPES.VIOLATION,
            name: CONST.VIOLATIONS.DUPLICATED_TRANSACTION,
            showInReview: true,
        },
        {
            type: CONST.VIOLATION_TYPES.VIOLATION,
            name: CONST.VIOLATIONS.MISSING_CATEGORY,
            showInReview: true,
        },
    ];
}

describe('MergeTransaction - mergeTransactionRequest', () => {
    let mockFetch: MockFetch;

    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(() => {
        global.fetch = TestHelper.getGlobalFetchMock();
        mockFetch = fetch as MockFetch;
        return Onyx.clear().then(waitForBatchedUpdates);
    });

    it('should update target transaction with merged values optimistically', async () => {
        // Given:
        // - Target transaction with original merchant and category values
        // - Source transaction that will be deleted after merge
        // - Merge transaction containing the final values to keep
        const targetTransaction = {
            ...createRandomTransaction(1),
            transactionID: 'target123',
            merchant: 'Original Merchant',
            category: 'Original Category',
        };
        const sourceTransaction = {
            ...createRandomTransaction(2),
            transactionID: 'source456',
        };
        const mergeTransaction = {
            ...createRandomMergeTransaction(1),
            targetTransactionID: 'target123',
            sourceTransactionID: 'source456',
            merchant: 'Updated Merchant',
            category: 'Updated Category',
            tag: 'Updated Tag',
        };
        const mergeTransactionID = 'merge789';

        // Set up initial state in Onyx
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${targetTransaction.transactionID}`, targetTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${sourceTransaction.transactionID}`, sourceTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.MERGE_TRANSACTION}${mergeTransactionID}`, mergeTransaction);

        mockFetch?.pause?.();

        // When: The merge transaction request is initiated
        // This should immediately update the UI with optimistic values
        MergeTransaction.mergeTransactionRequest(mergeTransactionID, mergeTransaction, targetTransaction, sourceTransaction);

        await mockFetch?.resume?.();
        await waitForBatchedUpdates();

        // Then: Verify that optimistic updates are applied correctly
        const updatedTargetTransaction = await new Promise<Transaction | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION}${targetTransaction.transactionID}`,
                callback: (transaction) => {
                    Onyx.disconnect(connection);
                    resolve(transaction ?? null);
                },
            });
        });

        const updatedSourceTransaction = await new Promise<Transaction | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION}${sourceTransaction.transactionID}`,
                callback: (transaction) => {
                    Onyx.disconnect(connection);
                    resolve(transaction ?? null);
                },
            });
        });

        const updatedMergeTransaction = await new Promise<MergeTransactionType | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.MERGE_TRANSACTION}${mergeTransactionID}`,
                callback: (transaction) => {
                    Onyx.disconnect(connection);
                    resolve(transaction ?? null);
                },
            });
        });

        // Verify target transaction is updated with merged values
        expect(updatedTargetTransaction?.merchant).toBe(mergeTransaction.merchant);
        expect(updatedTargetTransaction?.category).toBe(mergeTransaction.category);
        expect(updatedTargetTransaction?.tag).toBe(mergeTransaction.tag);
        expect(updatedTargetTransaction?.comment?.comment).toBe(mergeTransaction.description);

        // Verify source transaction is deleted
        expect(updatedSourceTransaction).toBeNull();

        // Verify merge transaction is cleaned up
        expect(updatedMergeTransaction).toBeNull();
    });

    it('should restore original state when API returns error', async () => {
        // Given:
        // - Target transaction with original data that should be restored on failure
        // - Source transaction that should be restored if merge fails
        // - Transaction violations are set up in Onyx for both transactions
        const targetTransaction = {
            ...createRandomTransaction(1),
            transactionID: 'target123',
            merchant: 'Original Merchant',
            category: 'Original Category',
        };
        const sourceTransaction = {
            ...createRandomTransaction(2),
            transactionID: 'source456',
            merchant: 'Source Merchant',
        };
        const mergeTransaction = {
            ...createRandomMergeTransaction(1),
            targetTransactionID: 'target123',
            sourceTransactionID: 'source456',
            merchant: 'Updated Merchant',
            category: 'Updated Category',
        };
        const mergeTransactionID = 'merge789';

        const mockViolations = createMockViolations();

        mockFetch?.pause?.();

        // Set up initial state in Onyx
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${targetTransaction.transactionID}`, targetTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${sourceTransaction.transactionID}`, sourceTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.MERGE_TRANSACTION}${mergeTransactionID}`, mergeTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${targetTransaction.transactionID}`, mockViolations);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${sourceTransaction.transactionID}`, mockViolations);
        await waitForBatchedUpdates();

        // When: The merge request is executed but the API will return an error
        mockFetch?.fail?.();

        MergeTransaction.mergeTransactionRequest(mergeTransactionID, mergeTransaction, targetTransaction, sourceTransaction);

        await waitForBatchedUpdates();

        // Resume fetch to process the failed API response
        await mockFetch?.resume?.();
        await waitForBatchedUpdates();

        // Then: Verify that original state is restored after API failure
        const restoredTargetTransaction = await new Promise<Transaction | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION}${targetTransaction.transactionID}`,
                callback: (transaction) => {
                    Onyx.disconnect(connection);
                    resolve(transaction ?? null);
                },
            });
        });

        const restoredSourceTransaction = await new Promise<Transaction | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION}${sourceTransaction.transactionID}`,
                callback: (transaction) => {
                    Onyx.disconnect(connection);
                    resolve(transaction ?? null);
                },
            });
        });

        // Verify target transaction is restored to original state
        expect(restoredTargetTransaction?.merchant).toBe('Original Merchant');
        expect(restoredTargetTransaction?.category).toBe('Original Category');

        // Verify source transaction is restored (not deleted)
        expect(restoredSourceTransaction?.transactionID).toBe('source456');
        expect(restoredSourceTransaction?.merchant).toBe('Source Merchant');
    });

    it('should handle transaction violations correctly during merge', async () => {
        // Given:
        // - Both transactions have DUPLICATED_TRANSACTION and MISSING_CATEGORY violations set in Onyx
        // - When merged, duplicate violations should be removed optimistically
        // - On success, only non-duplicate violations should remain
        const targetTransaction = {
            ...createRandomTransaction(1),
            transactionID: 'target123',
        };
        const sourceTransaction = {
            ...createRandomTransaction(2),
            transactionID: 'source456',
        };
        const mergeTransaction = {
            ...createRandomMergeTransaction(1),
            targetTransactionID: 'target123',
            sourceTransactionID: 'source456',
        };
        const mergeTransactionID = 'merge789';

        const mockViolations = createMockViolations();

        // Set up initial state with violations in Onyx
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${targetTransaction.transactionID}`, targetTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION}${sourceTransaction.transactionID}`, sourceTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.MERGE_TRANSACTION}${mergeTransactionID}`, mergeTransaction);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${targetTransaction.transactionID}`, mockViolations);
        await Onyx.set(`${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${sourceTransaction.transactionID}`, mockViolations);

        mockFetch?.pause?.();

        // When: The merge request is executed, which should handle violation updates
        // - Optimistically remove DUPLICATED_TRANSACTION violations since transactions are being merged
        // - Keep other violations like MISSING_CATEGORY intact
        MergeTransaction.mergeTransactionRequest(mergeTransactionID, mergeTransaction, targetTransaction, sourceTransaction);

        await mockFetch?.resume?.();
        await waitForBatchedUpdates();

        // Then: Verify that violations are updated correctly during optimistic phase
        // - DUPLICATED_TRANSACTION violations should be filtered out
        // - Other violations should remain unchanged
        const updatedTargetViolations = await new Promise<TransactionViolation[] | null>((resolve) => {
            const connection = Onyx.connect({
                key: `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${targetTransaction.transactionID}`,
                callback: (violations) => {
                    Onyx.disconnect(connection);
                    resolve(violations ?? null);
                },
            });
        });

        // Should only contain non-duplicate violations
        expect(updatedTargetViolations).toEqual([
            expect.objectContaining({
                name: CONST.VIOLATIONS.MISSING_CATEGORY,
            }),
        ]);

        // Should not contain duplicate transaction violations
        expect(updatedTargetViolations?.some((v) => v.name === CONST.VIOLATIONS.DUPLICATED_TRANSACTION)).toBeFalsy();
    });
});
