import {useRoute} from '@react-navigation/native';
import React, {useEffect, useMemo} from 'react';
import {View} from 'react-native';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import Button from '@components/Button';
import FullscreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import useTransactionViolations from '@hooks/useTransactionViolations';
import {openReport} from '@libs/actions/Report';
import {dismissDuplicateTransactionViolation} from '@libs/actions/Transaction';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {TransactionDuplicateNavigatorParamList} from '@libs/Navigation/types';
import {getLinkedTransactionID, getReportAction} from '@libs/ReportActionsUtils';
import {isReportIDApproved, isSettled} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import DuplicateTransactionsList from './DuplicateTransactionsList';

function TransactionDuplicateReview() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const route = useRoute<PlatformStackRouteProp<TransactionDuplicateNavigatorParamList, typeof SCREENS.TRANSACTION_DUPLICATE.REVIEW>>();
    const currentPersonalDetails = useCurrentUserPersonalDetails();
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${route.params.threadReportID}`, {canBeMissing: true});
    const [reportMetadata] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_METADATA}${route.params.threadReportID}`, {canBeMissing: true});
    const reportAction = getReportAction(report?.parentReportID, report?.parentReportActionID);
    const transactionID = getLinkedTransactionID(reportAction, report?.reportID) ?? undefined;
    const transactionViolations = useTransactionViolations(transactionID);
    const duplicateTransactionIDs = useMemo(
        () => transactionViolations?.find((violation) => violation.name === CONST.VIOLATIONS.DUPLICATED_TRANSACTION)?.data?.duplicates ?? [],
        [transactionViolations],
    );
    const transactionIDs = transactionID ? [transactionID, ...duplicateTransactionIDs] : duplicateTransactionIDs;

    const [transactions] = useOnyx(
        ONYXKEYS.COLLECTION.TRANSACTION,
        {
            selector: (allTransactions) =>
                transactionIDs
                    .map((id) => allTransactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${id}`])
                    .sort((a, b) => new Date(a?.created ?? '').getTime() - new Date(b?.created ?? '').getTime()),
            canBeMissing: true,
        },
        [transactionIDs],
    );

    const keepAll = () => {
        dismissDuplicateTransactionViolation(transactionIDs, currentPersonalDetails);
        Navigation.goBack();
    };

    const hasSettledOrApprovedTransaction = transactions?.some((transaction) => isSettled(transaction?.reportID) || isReportIDApproved(transaction?.reportID));

    useEffect(() => {
        if (!isEmptyObject(report) || !route.params.threadReportID) {
            return;
        }
        openReport(route.params.threadReportID);
    }, [report, route.params.threadReportID]);

    const isLoadingReport = isEmptyObject(report) && reportMetadata?.isLoadingInitialReportActions !== false;

    // eslint-disable-next-line rulesdir/no-negated-variables
    const shouldShowNotFound = !isLoadingReport && !transactionID;

    if (isLoadingReport) {
        return <FullscreenLoadingIndicator />;
    }

    return (
        <ScreenWrapper testID={TransactionDuplicateReview.displayName}>
            <FullPageNotFoundView shouldShow={shouldShowNotFound}>
                <HeaderWithBackButton
                    title={translate('iou.reviewDuplicates')}
                    onBackButtonPress={() => Navigation.goBack(route.params.backTo)}
                />
                <View style={[styles.justifyContentCenter, styles.ph5, styles.pb3, styles.borderBottom]}>
                    <Button
                        text={translate('iou.keepAll')}
                        onPress={keepAll}
                    />
                    {!!hasSettledOrApprovedTransaction && <Text style={[styles.textNormal, styles.colorMuted, styles.mt3]}>{translate('iou.someDuplicatesArePaid')}</Text>}
                </View>
                <DuplicateTransactionsList transactions={transactions ?? []} />
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

TransactionDuplicateReview.displayName = 'TransactionDuplicateReview';
export default TransactionDuplicateReview;
