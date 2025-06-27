import React, {useState} from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import {Folder, Tag} from '@components/Icon/Expensicons';
import * as Expensicons from '@components/Icon/Expensicons';
import MoneyRequestAmountInput from '@components/MoneyRequestAmountInput';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {convertToDisplayStringWithoutCurrency} from '@libs/CurrencyUtils';
import {getCleanedTagName} from '@libs/PolicyUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import BaseListItem from './BaseListItem';
import type {ListItem, SplitListItemProps, SplitListItemType} from './types';

function SplitListItem<TItem extends ListItem>({
    item,
    isFocused,
    showTooltip,
    isDisabled,
    onSelectRow,
    shouldPreventEnterKeySubmit,
    rightHandSideComponent,
    onFocus,
}: SplitListItemProps<TItem>) {
    const theme = useTheme();
    const styles = useThemeStyles();

    const splitItem = item as unknown as SplitListItemType;

    const formattedOriginalAmount = convertToDisplayStringWithoutCurrency(splitItem.originalAmount, splitItem.currency);

    const onSplitExpenseAmountChange = (amount: string) => {
        splitItem.onSplitExpenseAmountChange(splitItem.transactionID, Number(amount));
    };

    const isBottomVisible = !!splitItem.category || !!splitItem.tags?.at(0);

    const [prefixCharacterMargin, setPrefixCharacterMargin] = useState<number>(CONST.CHARACTER_WIDTH);
    const inputMarginLeft = prefixCharacterMargin + styles.pl1.paddingLeft;
    const contentWidth = (formattedOriginalAmount.length + 1) * CONST.CHARACTER_WIDTH;

    return (
        <BaseListItem
            item={item}
            wrapperStyle={[styles.flex1, styles.justifyContentBetween, styles.userSelectNone, styles.p3, styles.br3]}
            isFocused={isFocused}
            containerStyle={[styles.mh4, styles.mv1, styles.reportPreviewBoxHoverBorder, styles.br2]}
            hoverStyle={[styles.br2]}
            pressableStyle={[styles.br2]}
            isDisabled={isDisabled}
            showTooltip={showTooltip}
            onSelectRow={onSelectRow}
            shouldPreventEnterKeySubmit={shouldPreventEnterKeySubmit}
            rightHandSideComponent={rightHandSideComponent}
            shouldUseDefaultRightHandSideCheckmark={false}
            keyForList={item.keyForList}
            onFocus={onFocus}
            pendingAction={item.pendingAction}
        >
            <View style={[styles.flexRow, styles.containerWithSpaceBetween]}>
                <View style={[styles.flex1]}>
                    <View style={[styles.containerWithSpaceBetween, !isBottomVisible && styles.justifyContentCenter]}>
                        <View style={[styles.minHeight5, styles.justifyContentCenter]}>
                            <Text
                                numberOfLines={1}
                                style={[styles.textMicroSupporting, styles.pre, styles.flexShrink1]}
                            >
                                {splitItem.headerText}
                            </Text>
                        </View>
                        <View style={[styles.minHeight5, styles.justifyContentCenter, styles.gap2]}>
                            <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter, styles.alignItemsStretch]}>
                                <Text
                                    fontSize={variables.fontSizeNormal}
                                    style={[styles.flexShrink1]}
                                    numberOfLines={1}
                                >
                                    {splitItem.merchant}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {isBottomVisible && (
                        <View style={[styles.splitItemBottomContent]}>
                            {!!splitItem.category && (
                                <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1, styles.pr1, styles.flexShrink1, !!splitItem.tags?.at(0) && styles.mw50]}>
                                    <Icon
                                        src={Folder}
                                        height={variables.iconSizeExtraSmall}
                                        width={variables.iconSizeExtraSmall}
                                        fill={theme.icon}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.textMicroSupporting, styles.pre, styles.flexShrink1]}
                                    >
                                        {splitItem.category}
                                    </Text>
                                </View>
                            )}
                            {!!splitItem.tags?.at(0) && (
                                <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter, styles.gap1, styles.pl1, !!splitItem.category && styles.mw50]}>
                                    <Icon
                                        src={Tag}
                                        height={variables.iconSizeExtraSmall}
                                        width={variables.iconSizeExtraSmall}
                                        fill={theme.icon}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[styles.textMicroSupporting, styles.pre, styles.flexShrink1]}
                                    >
                                        {getCleanedTagName(splitItem.tags?.at(0) ?? '')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
                <View style={[styles.flexRow]}>
                    <View style={[styles.justifyContentCenter]}>
                        {splitItem.cannotBeEdited ? (
                            <View style={[styles.flexRow, styles.h13, styles.alignItemsCenter]}>
                                <Text
                                    style={[styles.optionRowAmountInput, styles.pAbsolute]}
                                    onLayout={(event) => {
                                        if (event.nativeEvent.layout.width === 0 && event.nativeEvent.layout.height === 0) {
                                            return;
                                        }
                                        setPrefixCharacterMargin(event?.nativeEvent?.layout.width);
                                    }}
                                >
                                    {splitItem.currencySymbol}
                                </Text>
                                <Text
                                    style={[styles.optionRowAmountInput, styles.getSplitListItemAmountStyle(inputMarginLeft, contentWidth)]}
                                    numberOfLines={1}
                                >
                                    {convertToDisplayStringWithoutCurrency(splitItem.amount, splitItem.currency)}
                                </Text>
                            </View>
                        ) : (
                            <MoneyRequestAmountInput
                                autoGrow={false}
                                amount={splitItem.amount}
                                currency={splitItem.currency}
                                prefixCharacter={splitItem.currencySymbol}
                                disableKeyboard={false}
                                isCurrencyPressable={false}
                                hideFocusedState={false}
                                hideCurrencySymbol
                                submitBehavior="blurAndSubmit"
                                formatAmountOnBlur
                                onAmountChange={onSplitExpenseAmountChange}
                                prefixContainerStyle={[styles.pv0, styles.h100]}
                                prefixStyle={styles.lineHeightUndefined}
                                inputStyle={[styles.optionRowAmountInput, styles.lineHeightUndefined]}
                                containerStyle={[styles.textInputContainer, styles.pl2, styles.pr1]}
                                touchableInputWrapperStyle={[styles.ml3]}
                                maxLength={formattedOriginalAmount.length + 1}
                                shouldApplyPaddingToContainer
                                contentWidth={contentWidth}
                            />
                        )}
                    </View>
                    <View style={[styles.popoverMenuIcon]}>
                        {splitItem.cannotBeEdited ? null : (
                            <View style={styles.pointerEventsAuto}>
                                <Icon
                                    src={Expensicons.ArrowRight}
                                    fill={theme.icon}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </BaseListItem>
    );
}

SplitListItem.displayName = 'SplitListItem';

export default SplitListItem;
