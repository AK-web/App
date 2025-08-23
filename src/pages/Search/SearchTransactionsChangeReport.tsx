import React, {useMemo} from 'react';
import {useSearchContext} from '@components/Search/SearchContext';
import type {ListItem} from '@components/SelectionList/types';
import useOnyx from '@hooks/useOnyx';
import {changeTransactionsReport} from '@libs/actions/Transaction';
import Navigation from '@libs/Navigation/Navigation';
import IOURequestEditReportCommon from '@pages/iou/request/step/IOURequestEditReportCommon';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

type TransactionGroupListItem = ListItem & {
    /** reportID of the report */
    value: string;
};

function SearchTransactionsChangeReport() {
    const {selectedTransactions, clearSelectedTransactions} = useSearchContext();
    const selectedTransactionsKeys = useMemo(() => Object.keys(selectedTransactions), [selectedTransactions]);
    const [allReportNextSteps] = useOnyx(ONYXKEYS.COLLECTION.NEXT_STEP, {canBeMissing: true});
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: true});

    const firstTransactionKey = selectedTransactionsKeys.at(0);
    const firstTransactionReportID = firstTransactionKey ? selectedTransactions[firstTransactionKey]?.reportID : undefined;
    const selectedReportID =
        Object.values(selectedTransactions).every((transaction) => transaction.reportID === firstTransactionReportID) && firstTransactionReportID !== CONST.REPORT.UNREPORTED_REPORT_ID
            ? firstTransactionReportID
            : undefined;

    const selectReport = (item: TransactionGroupListItem) => {
        if (selectedTransactionsKeys.length === 0) {
            return;
        }

        const reportNextStep = allReportNextSteps?.[`${ONYXKEYS.COLLECTION.NEXT_STEP}${item.value}`];
        changeTransactionsReport(selectedTransactionsKeys, item.value, allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${item.policyID}`], reportNextStep);
        clearSelectedTransactions();

        Navigation.goBack();
    };

    const removeFromReport = () => {
        if (selectedTransactionsKeys.length === 0) {
            return;
        }
        changeTransactionsReport(selectedTransactionsKeys, CONST.REPORT.UNREPORTED_REPORT_ID);
        clearSelectedTransactions();
        Navigation.goBack();
    };

    return (
        <IOURequestEditReportCommon
            backTo={undefined}
            transactionIDs={selectedTransactionsKeys}
            selectedReportID={selectedReportID}
            selectReport={selectReport}
            removeFromReport={removeFromReport}
            isEditing
        />
    );
}

SearchTransactionsChangeReport.displayName = 'SearchTransactionsChangeReport';

export default SearchTransactionsChangeReport;
