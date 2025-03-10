import {fromZonedTime, toZonedTime} from 'date-fns-tz';
import type {OnyxCollection} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import CONST from '@src/CONST';
import type {Policy, Report, ReportAction, Transaction, TransactionViolation} from '@src/types/onyx';
import {isApprover as isApprovedMember} from './actions/Policy/Member';
import {getCurrentUserAccountID} from './actions/Report';
import {
    arePaymentsEnabled,
    getConnectedIntegration,
    getCorrectedAutoReportingFrequency,
    hasAccountingConnections,
    hasIntegrationAutoSync,
    hasNoPolicyOtherThanPersonalType,
    isPrefferedExporter,
} from './PolicyUtils';
import {getIOUActionForReportID, getReportActions, isPayAction} from './ReportActionsUtils';
import {
    isClosedReport,
    isCurrentUserSubmitter,
    isExpenseReport,
    isExported,
    isInvoiceReport,
    isIOUReport,
    isOpenReport,
    isPayer,
    isProcessingReport,
    isReportApproved,
    isReportManager,
    isSettled,
} from './ReportUtils';
import {getSession} from './SessionUtils';
import {allHavePendingRTERViolation, isDuplicate, isOnHold as isOnHoldTransactionUtils, shouldShowBrokenConnectionViolationForMultipleTransactions} from './TransactionUtils';

function isSubmitAction(report: Report, policy: Policy): boolean {
    const isExpense = isExpenseReport(report);

    if (!isExpense) {
        return false;
    }

    const isSubmitter = isCurrentUserSubmitter(report.reportID);
    const isApprover = isApprovedMember(policy, getCurrentUserAccountID());

    if (!isSubmitter && !isApprover) {
        return false;
    }

    const isOpen = isOpenReport(report);

    if (!isOpen) {
        return false;
    }

    const autoReportingFrequency = getCorrectedAutoReportingFrequency(policy);

    const isScheduledSubmitEnabled = policy?.harvesting?.enabled && autoReportingFrequency !== CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MANUAL;

    return !!isScheduledSubmitEnabled;
}

function isApproveAction(report: Report, policy: Policy, reportTransactions: Transaction[], violations: OnyxCollection<TransactionViolation[]>): boolean {
    const isExpense = isExpenseReport(report);
    const isApprover = isApprovedMember(policy, getCurrentUserAccountID());
    const isProcessing = isProcessingReport(report);
    const hasDuplicates = reportTransactions.some((transaction) => isDuplicate(transaction.transactionID));

    if (isExpense && isApprover && isProcessing && hasDuplicates) {
        return true;
    }

    const transactionIDs = reportTransactions.map((t) => t.transactionID);

    const hasAllPendingRTERViolations = allHavePendingRTERViolation(transactionIDs, violations);

    if (hasAllPendingRTERViolations) {
        return true;
    }

    const isAdmin = policy?.role === CONST.POLICY.ROLE.ADMIN;

    const shouldShowBrokenConnectionViolation = shouldShowBrokenConnectionViolationForMultipleTransactions(transactionIDs, report, policy, violations);

    const userControllsReport = isApprover || isAdmin;
    return userControllsReport && shouldShowBrokenConnectionViolation;
}

function isUnapproveAction(report: Report, policy: Policy): boolean {
    const isExpense = isExpenseReport(report);
    const isApprover = isApprovedMember(policy, getCurrentUserAccountID());
    const isApproved = isReportApproved({report});

    return isExpense && isApprover && isApproved;
}

function isCancelPaymentAction(report: Report, reportTransactions: Transaction[]): boolean {
    const isExpense = isExpenseReport(report);

    if (!isExpense) {
        return false;
    }

    const isPaidElsewhere = report.stateNum === CONST.REPORT.STATE_NUM.APPROVED && report.statusNum === CONST.REPORT.STATUS_NUM.REIMBURSED;

    if (isPaidElsewhere) {
        return true;
    }

    const isPaymentProcessing = isSettled(report);

    const payActions = reportTransactions.reduce((acc, transaction) => {
        const action = getIOUActionForReportID(report.reportID, transaction.transactionID);
        if (action && isPayAction(action)) {
            acc.push(action);
        }
        return acc;
    }, [] as ReportAction[]);

    const hasDailyNachaCutoffPassed = payActions.some((action) => {
        const actionCreated = fromZonedTime(action.created, 'UTC');
        const actionCreatedTime = actionCreated.getTime();
        const day = actionCreated.getDate();
        const month = actionCreated.getMonth() + 1; // getMonth return 0-11
        const year = actionCreated.getFullYear();
        const cutoff = `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day} 23:45:00`;
        const cutoffTime = toZonedTime(cutoff, 'UTC').getTime();

        return actionCreatedTime > cutoffTime;
    });
    return isPaymentProcessing && !hasDailyNachaCutoffPassed;
}

function isExportAction(report: Report, policy: Policy): boolean {
    const isInvoice = isInvoiceReport(report);
    const isSender = isCurrentUserSubmitter(report.reportID);

    if (isInvoice && isSender) {
        return true;
    }

    const isExpense = isExpenseReport(report);

    const hasAccountingConnection = hasAccountingConnections(policy);

    if (!isExpense || !hasAccountingConnection) {
        return false;
    }

    const isApproved = isReportApproved({report});
    const isReportPayer = isPayer(getSession(), report, false, policy);
    const isPaymentsEnabled = arePaymentsEnabled(policy);
    const isClosed = isClosedReport(report);

    if (isReportPayer && isPaymentsEnabled && (isApproved || isClosed)) {
        return true;
    }

    const isAdmin = policy?.role === CONST.POLICY.ROLE.ADMIN;
    const isReimbursed = report.statusNum === CONST.REPORT.STATUS_NUM.REIMBURSED;
    const connectedIntegration = getConnectedIntegration(policy);
    const syncEnabled = hasIntegrationAutoSync(policy, connectedIntegration);
    const isReportExported = isExported(getReportActions(report));
    const isFinished = isApproved || isReimbursed || isClosed;

    return isAdmin && isFinished && syncEnabled && !isReportExported;
}

function isMarkAsExportedAction(report: Report, policy: Policy): boolean {
    const isInvoice = isInvoiceReport(report);
    const isSender = isCurrentUserSubmitter(report.reportID);

    if (isInvoice && isSender) {
        return true;
    }

    const isExpense = isExpenseReport(report);

    if (!isExpense) {
        return false;
    }

    const isReportPayer = isPayer(getSession(), report, false, policy);
    const isPaymentsEnabled = arePaymentsEnabled(policy);
    const isApproved = isReportApproved({report});
    const isClosed = isClosedReport(report);
    const isClosedOrApproved = isClosed || isApproved;

    if (isReportPayer && isPaymentsEnabled && isClosedOrApproved) {
        return true;
    }

    const isAdmin = policy?.role === CONST.POLICY.ROLE.ADMIN;
    const isReimbursed = isSettled(report);
    const hasAccountingConnection = hasAccountingConnections(policy);
    const connectedIntegration = getConnectedIntegration(policy);
    const syncEnabled = hasIntegrationAutoSync(policy, connectedIntegration);
    const isFinished = isClosedOrApproved || isReimbursed;

    if (isAdmin && isFinished && hasAccountingConnection && syncEnabled) {
        return true;
    }

    const isExporter = isPrefferedExporter(policy);

    if (isExporter && isFinished && hasAccountingConnection && !syncEnabled) {
        return true;
    }

    return false;
}

function isHoldAction(report: Report, reportTransactions: Transaction[]): boolean {
    const isExpense = isExpenseReport(report);

    if (!isExpense) {
        return false;
    }

    const isOnHold = reportTransactions.some(isOnHoldTransactionUtils);

    if (isOnHold) {
        return false;
    }

    const isOpen = isOpenReport(report);
    const isProcessing = isProcessingReport(report);
    const isApproved = isReportApproved({report});

    return isOpen || isProcessing || isApproved;
}

function isChangeWorkspaceAction(report: Report, policy: Policy, reportTransactions: Transaction[], violations: OnyxCollection<TransactionViolation[]>): boolean {
    const isExpense = isExpenseReport(report);
    const isSubmitter = isCurrentUserSubmitter(report.reportID);
    const areWorkflowsEnabled = policy.areWorkflowsEnabled;
    const isClosed = isClosedReport(report);

    if (isExpense && isSubmitter && !areWorkflowsEnabled && isClosed) {
        return true;
    }

    const isOpen = isOpenReport(report);
    const isProcessing = isProcessingReport(report);

    if (isSubmitter && (isOpen || isProcessing)) {
        return true;
    }

    const isApprover = isApprovedMember(policy, getCurrentUserAccountID());

    if (isApprover && isProcessing) {
        return true;
    }

    const isReportPayer = isPayer(getSession(), report, false, policy);
    const isApproved = isReportApproved({report});

    if (isReportPayer && (isApproved || isClosed)) {
        return true;
    }

    const isAdmin = policy?.role === CONST.POLICY.ROLE.ADMIN;
    const isReimbursed = isSettled(report);
    const transactionIDs = reportTransactions.map((t) => t.transactionID);
    const hasAllPendingRTERViolations = allHavePendingRTERViolation(transactionIDs, violations);

    const shouldShowBrokenConnectionViolation = shouldShowBrokenConnectionViolationForMultipleTransactions(transactionIDs, report, policy, violations);

    const userControlsReport = isSubmitter || isApprover || isAdmin;
    const hasReceiptMatchViolation = hasAllPendingRTERViolations || (userControlsReport && shouldShowBrokenConnectionViolation);
    const isReportExported = isExported(getReportActions(report));

    if (isAdmin && ((!isReportExported && (isApproved || isReimbursed || isClosed)) || hasReceiptMatchViolation)) {
        return true;
    }

    const isIOU = isIOUReport(report);
    const hasOnlyPersonalWorkspace = hasNoPolicyOtherThanPersonalType();
    const isReceiver = isReportManager(report);
    if (isIOU && !hasOnlyPersonalWorkspace && isReceiver && isReimbursed) {
        return true;
    }

    return false;
}

function isDeleteAction(report: Report): boolean {
    const isExpense = isExpenseReport(report);

    if (!isExpense) {
        return false;
    }

    const isSubmitter = isCurrentUserSubmitter(report.reportID);

    if (!isSubmitter) {
        return false;
    }

    const isOpen = isOpenReport(report);
    const isProcessing = isProcessingReport(report);
    const isApproved = isReportApproved({report});

    return isOpen || isProcessing || isApproved;
}

function getSecondaryActions(
    report: Report,
    policy: Policy,
    reportTransactions: Transaction[],
    violations: OnyxCollection<TransactionViolation[]>,
): Array<ValueOf<typeof CONST.REPORT.SECONDARY_ACTIONS>> {
    const options: Array<ValueOf<typeof CONST.REPORT.SECONDARY_ACTIONS>> = [];

    if (isSubmitAction(report, policy)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.SUBMIT);
    }

    if (isApproveAction(report, policy, reportTransactions, violations)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.APPROVE);
    }

    if (isUnapproveAction(report, policy)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.UNAPPROVE);
    }

    if (isCancelPaymentAction(report, reportTransactions)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.CANCEL_PAYMENT);
    }

    if (isExportAction(report, policy)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.EXPORT_TO_ACCOUNTING);
    }

    if (isMarkAsExportedAction(report, policy)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.MARK_AS_EXPORTED);
    }

    if (isHoldAction(report, reportTransactions)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.HOLD);
    }

    options.push(CONST.REPORT.SECONDARY_ACTIONS.DOWNLOAD);

    if (isChangeWorkspaceAction(report, policy, reportTransactions, violations)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.CHANGE_WORKSPACE);
    }

    options.push(CONST.REPORT.SECONDARY_ACTIONS.VIEW_DETAILS);

    if (isDeleteAction(report)) {
        options.push(CONST.REPORT.SECONDARY_ACTIONS.DELETE);
    }

    return options;
}

export default getSecondaryActions;
