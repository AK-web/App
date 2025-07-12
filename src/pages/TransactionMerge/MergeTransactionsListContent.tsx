import React, {useCallback, useEffect, useMemo} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import EmptyStateComponent from '@components/EmptyStateComponent';
import {EmptyShelves} from '@components/Icon/Illustrations';
import RenderHTML from '@components/RenderHTML';
import SelectionList from '@components/SelectionList';
import type {ListItem} from '@components/SelectionList/types';
import MergeExpensesSkeleton from '@components/Skeletons/MergeExpensesSkeleton';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getTransactionsForMerging, setMergeTransactionKey} from '@libs/actions/Transaction';
import {getSourceTransaction} from '@libs/MergeTransactionUtils';
import Navigation from '@libs/Navigation/Navigation';
import {shouldNavigateToMergeReceipt} from '@libs/TransactionUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {MergeTransaction} from '@src/types/onyx';
import type {Errors} from '@src/types/onyx/OnyxCommon';
import type Transaction from '@src/types/onyx/Transaction';
import MergeTransactionItem from './MergeTransactionItem';

type MergeTransactionsListContentProps = {
    transactionID: string;
    mergeTransaction: OnyxEntry<MergeTransaction>;
};

type MergeTransactionListItemType = Transaction & ListItem;

function MergeTransactionsListContent({transactionID, mergeTransaction}: MergeTransactionsListContentProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [targetTransaction] = useOnyx(`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`, {canBeMissing: false});
    const [report] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${targetTransaction?.reportID}`, {canBeMissing: false});
    const eligibleTransactions = mergeTransaction?.eligibleTransactions;

    useEffect(() => {
        getTransactionsForMerging(transactionID);
    }, [transactionID]);

    const sections = useMemo(() => {
        return [
            {
                data: (eligibleTransactions ?? []).map((eligibleTransaction) => ({
                    ...eligibleTransaction,
                    keyForList: eligibleTransaction.transactionID,
                    isSelected: eligibleTransaction.transactionID === mergeTransaction?.sourceTransactionID,
                    errors: eligibleTransaction.errors as Errors | undefined,
                })),
                shouldShow: true,
            },
        ];
    }, [eligibleTransactions, mergeTransaction]);

    const handleSelectRow = useCallback(
        (item: MergeTransactionListItemType) => {
            setMergeTransactionKey(transactionID, {
                sourceTransactionID: item.transactionID,
            });
        },
        [transactionID],
    );

    const headerContent = useMemo(
        () => (
            <View style={[styles.ph5, styles.pb5]}>
                <Text style={[styles.textLabel, styles.minHeight5]}>
                    <RenderHTML html={translate('transactionMerge.listPage.selectTransactionToMerge')} />
                    <Text style={[styles.textBold]}> {report?.reportName ?? ''}</Text>
                </Text>
            </View>
        ),
        [report?.reportName, translate, styles.ph5, styles.pb5, styles.textLabel, styles.minHeight5, styles.textBold],
    );

    const subTitleContent = useMemo(() => {
        return (
            <Text style={[styles.textAlignCenter, styles.textSupporting, styles.textNormal]}>
                <RenderHTML html={translate('transactionMerge.listPage.noEligibleExpenseFoundSubtitle')} />
            </Text>
        );
    }, [translate, styles.textAlignCenter, styles.textSupporting, styles.textNormal]);

    const handleConfirm = useCallback(() => {
        const sourceTransaction = getSourceTransaction(mergeTransaction);

        if (!sourceTransaction || !targetTransaction) {
            return;
        }

        if (shouldNavigateToMergeReceipt([targetTransaction, sourceTransaction])) {
            Navigation.navigate(ROUTES.MERGE_TRANSACTION_RECEIPT_PAGE.getRoute(transactionID, Navigation.getReportRHPActiveRoute()));
        } else {
            const mergedReceiptID = sourceTransaction?.receipt?.receiptID ?? targetTransaction?.receipt?.receiptID;
            setMergeTransactionKey(transactionID, {
                receiptID: mergedReceiptID,
            });
            Navigation.navigate(ROUTES.MERGE_TRANSACTION_DETAILS_PAGE.getRoute(transactionID, Navigation.getReportRHPActiveRoute()));
        }
    }, [mergeTransaction, transactionID, targetTransaction]);

    if (eligibleTransactions?.length === 0) {
        return (
            <EmptyStateComponent
                cardStyles={[styles.appBG]}
                cardContentStyles={[styles.p0]}
                headerMediaType={CONST.EMPTY_STATE_MEDIA.ILLUSTRATION}
                headerMedia={EmptyShelves}
                title={translate('transactionMerge.listPage.noEligibleExpenseFound')}
                subtitleText={subTitleContent}
                headerStyles={[styles.emptyStateCardIllustrationContainer, styles.justifyContentStart]}
                headerContentStyles={styles.emptyStateCardIllustration}
            />
        );
    }

    return (
        <SelectionList<MergeTransactionListItemType>
            sections={sections}
            shouldShowTextInput={false}
            ListItem={MergeTransactionItem}
            confirmButtonStyles={[styles.justifyContentCenter]}
            showConfirmButton
            confirmButtonText={translate('common.continue')}
            onSelectRow={handleSelectRow}
            showLoadingPlaceholder
            LoadingPlaceholderComponent={MergeExpensesSkeleton}
            fixedNumItemsForLoader={3}
            headerContent={headerContent}
            onConfirm={handleConfirm}
        />
    );
}

MergeTransactionsListContent.displayName = 'MergeTransactionsListContent';

export default MergeTransactionsListContent;
