import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import {Zoom} from '@components/Icon/Expensicons';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import RadioButton from '@components/RadioButton';
import ReportActionItemImage from '@components/ReportActionItem/ReportActionItemImage';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import {getThumbnailAndImageURIs} from '@libs/ReceiptUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Transaction} from '@src/types/onyx';
import type { Receipt } from '@src/types/onyx/Transaction';

type TransactionMergeReceiptsProps = {
    transactions: Transaction[];
    selectedReceiptID: number | undefined;
    onSelect: (receipt: Receipt | undefined) => void;
};

function TransactionMergeReceipts({transactions, selectedReceiptID, onSelect}: TransactionMergeReceiptsProps) {
    const styles = useThemeStyles();

    return (
        <View style={[styles.flexRow, styles.flexWrap, styles.justifyContentBetween]}>
            {transactions.map((transaction, index) => {
                const receiptURIs = getThumbnailAndImageURIs(transaction);
                return (
                    <View
                        key={transaction.transactionID}
                        style={[styles.flexColumn, styles.alignItemsCenter, styles.w100, styles.mb2]}
                    >
                        <PressableWithFeedback
                            onPress={() => onSelect(transaction.receipt)}
                            wrapperStyle={[styles.w100]}
                            style={[styles.alignItemsCenter, styles.justifyContentCenter, styles.mergeTransactionReceiptThumbnail]}
                            accessibilityRole={CONST.ROLE.RADIO}
                            accessibilityLabel={`Select receipt for transaction ${transaction.transactionID}`}
                        >
                            <View style={[styles.flexRow, styles.alignItemsCenter, styles.justifyContentBetween, styles.w100, styles.mb5]}>
                                <Text style={[styles.headerText]}>Receipt {index + 1}</Text>
                                <RadioButton
                                    isChecked={selectedReceiptID === transaction.receipt?.receiptID}
                                    onPress={() => onSelect(transaction.receipt)}
                                    accessibilityLabel={`Select receipt for transaction ${transaction.transactionID}`}
                                    newRadioButtonStyle
                                />
                            </View>
                            <View style={[styles.mergeTransactionReceiptImage, styles.pRelative]}>
                                <ReportActionItemImage
                                    thumbnail={receiptURIs.thumbnail}
                                    fileExtension={receiptURIs.fileExtension}
                                    isThumbnail={receiptURIs.isThumbnail}
                                    image={receiptURIs.image}
                                    isLocalFile={receiptURIs.isLocalFile}
                                    filename={receiptURIs.filename}
                                    transaction={transaction}
                                    readonly
                                />
                                <View style={[styles.pAbsolute, styles.b2, styles.r2]}>
                                    <Button
                                        innerStyles={[styles.arrowIcon]}
                                        icon={Zoom}
                                        onPress={() => {
                                            Navigation.navigate(ROUTES.TRANSACTION_RECEIPT.getRoute(transaction.reportID, transaction.transactionID, true));
                                        }}
                                    />
                                </View>
                            </View>
                        </PressableWithFeedback>
                    </View>
                );
            })}
        </View>
    );
}

export default TransactionMergeReceipts;
