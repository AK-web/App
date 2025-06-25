import {renderHook} from '@testing-library/react-native';
import useNewTransactions from '@hooks/useNewTransactions';
import type {Transaction} from '@src/types/onyx';

// We need to mock requestAnimationFrame to mimic long Onyx merge overhead
jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    setTimeout(() => {
        callback(performance.now());
    }, 30);
    return 0;
});

// eslint-disable-next-line no-promise-executor-return
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('useNewTransactions after clean cache', () => {
    const transactionsAlreadyInReport = [
        {transactionID: '2', amount: 200, created: '2023-10-02', currency: 'USD', reportID: 'report1', merchant: ''},
        {transactionID: '3', amount: 300, created: '2023-10-03', currency: 'USD', reportID: 'report1', merchant: ''},
    ];
    const newTransaction = {transactionID: '1', amount: 100, created: '2023-10-01T00:00:00Z', currency: 'USD', reportID: 'report1', merchant: ''};

    it("doesn't return new transactions when no transactions are added", async () => {
        // 1. Report and transactions data is not loaded yet
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: false,
                transactions: [],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly

        // 2. Report is loaded and it has no transactions so there are no further rerenders
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        expect(result.current).toEqual([]);
    });

    it('returns no new transactions when transactions come from initial Report load', async () => {
        // 1. Report and transactions data is not loaded yet
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: false,
                transactions: [] as Transaction[],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. Report is loaded and transactions data is not loaded yet
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 3. Report is loaded and transactions data is loaded
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport,
        });
        expect(result.current).toEqual([]); // there is no new transactions, because the transactions that were already in the report are not considered new
    });

    it('returns new transactions when transactions are added after initial load', async () => {
        // 1. Report and transactions data is not loaded yet
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: false,
                transactions: [] as Transaction[],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. Report is loaded and transactions data is not loaded yet
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 3. Report is loaded and transactions data is loaded
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport,
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 4. User added new transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [...transactionsAlreadyInReport, newTransaction],
        });
        expect(result.current).toEqual([newTransaction]);
    });

    it('returns new transactions when adding transactions to empty report', async () => {
        // 1. Report and transactions data is not loaded yet
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: false,
                transactions: [] as Transaction[],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly

        // 2. Report is loaded and it has no transactions so there are no further rerenders
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        await delay(1000);
        expect(result.current).toEqual([]);

        // 3. User added new transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [newTransaction],
        });
        expect(result.current).toEqual([newTransaction]);
    });

    it('returns no new transactions when transactions are removed', async () => {
        // 1. Report and transactions data is not loaded yet
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: false,
                transactions: [] as Transaction[],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. Report is loaded and transactions data is not loaded yet
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 3. Report is loaded and transactions data is loaded
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport,
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 4. User removes a transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport.slice(1), // Remove the first transaction
        });
        await delay(10);
        expect(result.current).toEqual([]);
    });
});

describe('useNewTransactions with hydrated cache', () => {
    const transactionsAlreadyInReport = [
        {transactionID: '2', amount: 200, created: '2023-10-02', currency: 'USD', reportID: 'report1', merchant: ''},
        {transactionID: '3', amount: 300, created: '2023-10-03', currency: 'USD', reportID: 'report1', merchant: ''},
    ];
    const newTransaction = {transactionID: '1', amount: 100, created: '2023-10-01T00:00:00Z', currency: 'USD', reportID: 'report1', merchant: ''};

    it("doesn't return new transactions when no transactions are added", async () => {
        // 1. Report and transactions data is loaded from Onyx
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: true,
                transactions: [],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly

        // 2. Report is loaded and transactions data is loaded, but there were no new transactions
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        expect(result.current).toEqual([]);
    });

    it('returns new transactions when newly added transactions come from initial Report load', async () => {
        // 1. Report and transactions data is loaded from Onyx
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: true,
                transactions: transactionsAlreadyInReport,
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. New transaction comes in when report is loaded
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [...transactionsAlreadyInReport, newTransaction],
        });
        expect(result.current).toEqual([newTransaction]);
    });

    it('returns new transactions when transactions are added after initial load', async () => {
        // 1. Report and transactions data is loaded from Onyx
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: true,
                transactions: transactionsAlreadyInReport,
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. Report is loaded and transactions data is loaded, but there were no new transactions
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport,
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 3. User added new transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [...transactionsAlreadyInReport, newTransaction],
        });
        expect(result.current).toEqual([newTransaction]);
    });

    it('returns new transactions when adding transactions to empty report', async () => {
        // 1. Report and transactions data is loaded from Onyx
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: true,
                transactions: [] as Transaction[],
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly

        // 2. Report is loaded and it has no transactions, so there are no further rerenders
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [],
        });
        await delay(1000);
        expect(result.current).toEqual([]);

        // 3. User added new transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: [newTransaction],
        });
        expect(result.current).toEqual([newTransaction]);
    });

    it('returns no new transactions when transactions are removed', async () => {
        // 1. Report and transactions data is loaded from Onyx
        const {rerender, result} = renderHook((props) => useNewTransactions(props.hasOnceLoadedReportActions, props.transactions), {
            initialProps: {
                hasOnceLoadedReportActions: true,
                transactions: transactionsAlreadyInReport,
            },
        });
        await delay(10); // We need to wait to ensure that usePrevious hook updates correctly
        expect(result.current).toEqual([]);

        // 2. Report is loaded and transactions data is loaded, but there were no new transactions
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport,
        });
        await delay(10);
        expect(result.current).toEqual([]);

        // 3. User removes a transaction
        rerender({
            hasOnceLoadedReportActions: true,
            transactions: transactionsAlreadyInReport.slice(1), // Remove the first transaction
        });
        await delay(10);
        expect(result.current).toEqual([]);
    });
});

afterAll(() => {
    jest.restoreAllMocks();
});
