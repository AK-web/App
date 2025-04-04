import {useFocusEffect} from '@react-navigation/native';
import {Str} from 'expensify-common';
import React, {useCallback, useMemo} from 'react';
import type {ListRenderItemInfo} from 'react-native';
import {ActivityIndicator} from 'react-native';
import FlatList from '@components/FlatList';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {Plus} from '@components/Icon/Expensicons';
import {ReportReceipt} from '@components/Icon/Illustrations';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import usePolicy from '@hooks/usePolicy';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {enablePolicyReportFields, setPolicyPreventMemberCreatedTitle} from '@libs/actions/Policy/Policy';
import localeCompare from '@libs/LocaleCompare';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import {isControlPolicy} from '@libs/PolicyUtils';
import {getReportFieldTypeTranslationKey} from '@libs/WorkspaceReportFieldUtils';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {openPolicyReportFieldsPage} from '@userActions/Policy/ReportField';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type ReportFieldForList = ListItem & {
    fieldID: string;
    rightLabel: string;
    isDisabled: boolean;
};

type WorkspaceReportFieldsPageProps = PlatformStackScreenProps<WorkspaceSplitNavigatorParamList, typeof SCREENS.WORKSPACE.REPORT_FIELDS>;

function WorkspaceReportFieldsPage({
    route: {
        params: {policyID},
    },
}: WorkspaceReportFieldsPageProps) {
    // We need to use isSmallScreenWidth instead of shouldUseNarrowLayout for the small screen selection mode
    // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();
    const theme = useTheme();
    const {translate} = useLocalize();
    const policy = usePolicy(policyID);
    const filteredPolicyFieldList = useMemo(() => {
        if (!policy?.fieldList) {
            return {};
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return Object.fromEntries(Object.entries(policy.fieldList).filter(([_, value]) => value.fieldID !== 'text_title'));
    }, [policy]);

    const fetchReportFields = useCallback(() => {
        openPolicyReportFieldsPage(policyID);
    }, [policyID]);

    const {isOffline} = useNetwork({onReconnect: fetchReportFields});

    useFocusEffect(fetchReportFields);

    const reportFieldsSections = useMemo(() => {
        if (!policy) {
            return [];
        }

        return Object.values(filteredPolicyFieldList)
            .sort((a, b) => localeCompare(a.name, b.name))
            .map((reportField) => ({
                text: reportField.name,
                keyForList: String(reportField.fieldID),
                fieldID: reportField.fieldID,
                pendingAction: reportField.pendingAction,
                isDisabled: reportField.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
                rightLabel: Str.recapitalize(translate(getReportFieldTypeTranslationKey(reportField.type))),
            }));
    }, [filteredPolicyFieldList, policy, translate]);

    const navigateToReportFieldsSettings = useCallback(
        (reportField: ReportFieldForList) => {
            Navigation.navigate(ROUTES.WORKSPACE_REPORT_FIELDS_SETTINGS.getRoute(policyID, reportField.fieldID));
        },
        [policyID],
    );

    const isLoading = !isOffline && policy === undefined;

    const renderItem = useCallback(
        ({item}: ListRenderItemInfo<ReportFieldForList>) => (
            <OfflineWithFeedback pendingAction={item.pendingAction}>
                <MenuItem
                    style={shouldUseNarrowLayout ? styles.ph5 : styles.ph8}
                    onPress={() => navigateToReportFieldsSettings(item)}
                    description={item.text}
                    disabled={item.isDisabled}
                    shouldShowRightIcon={!item.isDisabled}
                    interactive={!item.isDisabled}
                    rightLabel={item.rightLabel}
                    descriptionTextStyle={[styles.popoverMenuText, styles.textStrong]}
                />
            </OfflineWithFeedback>
        ),

        [shouldUseNarrowLayout, styles.ph5, styles.ph8, styles.popoverMenuText, styles.textStrong, navigateToReportFieldsSettings],
    );

    const reportTitlePendingFields = policy?.fieldList?.[CONST.POLICY.FIELDS.FIELD_LIST_TITLE]?.pendingFields ?? {};

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
        >
            <ScreenWrapper
                includeSafeAreaPaddingBottom={false}
                style={[styles.defaultModalContainer]}
                testID={WorkspaceReportFieldsPage.displayName}
                shouldShowOfflineIndicatorInWideScreen
                offlineIndicatorStyle={styles.mtAuto}
            >
                <HeaderWithBackButton
                    icon={ReportReceipt}
                    title={translate('common.reports')}
                    shouldUseHeadlineHeader
                    shouldShowBackButton={shouldUseNarrowLayout}
                />
                {isLoading && (
                    <ActivityIndicator
                        size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                        style={styles.flex1}
                        color={theme.spinner}
                    />
                )}
                {!isLoading && (
                    <ScrollView contentContainerStyle={[styles.flexGrow1, styles.mt3, shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection]}>
                        <Section
                            isCentralPane
                            title={translate('workspace.common.reportTitle')}
                            renderSubtitle={() => (
                                <Text style={[[styles.textLabelSupportingEmptyValue, styles.lh20, styles.mt1]]}>
                                    {translate('workspace.rules.expenseReportRules.customReportNamesSubtitle')}
                                    <TextLink
                                        style={[styles.link]}
                                        href={CONST.CUSTOM_REPORT_NAME_HELP_URL}
                                    >
                                        {translate('workspace.rules.expenseReportRules.customNameDescriptionLink')}
                                    </TextLink>
                                    .
                                </Text>
                            )}
                            containerStyles={shouldUseNarrowLayout ? styles.p5 : styles.p8}
                            titleStyles={[styles.textHeadline, styles.cardSectionTitle, styles.accountSettingsSectionTitle, styles.mb1]}
                        >
                            <OfflineWithFeedback pendingAction={reportTitlePendingFields.defaultValue}>
                                <MenuItemWithTopDescription
                                    description={translate('workspace.rules.expenseReportRules.customNameTitle')}
                                    title={policy?.fieldList?.[CONST.POLICY.FIELDS.FIELD_LIST_TITLE].defaultValue}
                                    shouldShowRightIcon
                                    style={[styles.sectionMenuItemTopDescription, styles.mt6, styles.mbn3]}
                                    onPress={() => Navigation.navigate(ROUTES.RULES_CUSTOM_NAME.getRoute(policyID))}
                                />
                            </OfflineWithFeedback>
                            <ToggleSettingOptionRow
                                pendingAction={reportTitlePendingFields.deletable}
                                title={translate('workspace.rules.expenseReportRules.preventMembersFromChangingCustomNamesTitle')}
                                switchAccessibilityLabel={translate('workspace.rules.expenseReportRules.preventMembersFromChangingCustomNamesTitle')}
                                wrapperStyle={[styles.sectionMenuItemTopDescription, styles.mt6]}
                                titleStyle={styles.pv2}
                                isActive={!policy?.fieldList?.[CONST.POLICY.FIELDS.FIELD_LIST_TITLE].deletable}
                                onToggle={(isEnabled) => {
                                    if (isEnabled && !isControlPolicy(policy)) {
                                        Navigation.navigate(
                                            ROUTES.WORKSPACE_UPGRADE.getRoute(
                                                policyID,
                                                CONST.UPGRADE_FEATURE_INTRO_MAPPING.policyPreventMemberChangingTitle.alias,
                                                ROUTES.WORKSPACE_REPORT_FIELDS.getRoute(policyID),
                                            ),
                                        );
                                        return;
                                    }

                                    setPolicyPreventMemberCreatedTitle(policyID, isEnabled);
                                }}
                            />
                        </Section>
                        <Section
                            isCentralPane
                            containerStyles={shouldUseNarrowLayout ? styles.p5 : styles.p8}
                        >
                            <ToggleSettingOptionRow
                                pendingAction={policy?.pendingFields?.areReportFieldsEnabled}
                                title={translate('workspace.common.reportFields')}
                                switchAccessibilityLabel={translate('workspace.common.reportFields')}
                                subtitle={translate('workspace.reportFields.subtitle')}
                                subtitleStyle={[styles.textLabelSupportingEmptyValue, styles.lh20]}
                                titleStyle={[styles.textHeadline, styles.cardSectionTitle, styles.accountSettingsSectionTitle, styles.mb1]}
                                isActive={!!policy?.areReportFieldsEnabled}
                                onToggle={(isEnabled) => {
                                    if (isEnabled && !isControlPolicy(policy)) {
                                        Navigation.navigate(
                                            ROUTES.WORKSPACE_UPGRADE.getRoute(
                                                policyID,
                                                CONST.UPGRADE_FEATURE_INTRO_MAPPING.reportFields.alias,
                                                ROUTES.WORKSPACE_REPORT_FIELDS.getRoute(policyID),
                                            ),
                                        );
                                        return;
                                    }
                                    enablePolicyReportFields(policyID, isEnabled, true);
                                }}
                                subMenuItems={
                                    !!policy?.areReportFieldsEnabled && (
                                        <>
                                            <FlatList
                                                data={reportFieldsSections}
                                                renderItem={renderItem}
                                                style={[styles.mhn8, styles.mt6, styles.mbn3]}
                                            />
                                            <MenuItem
                                                onPress={() => Navigation.navigate(ROUTES.WORKSPACE_CREATE_REPORT_FIELD.getRoute(policyID))}
                                                title={translate('workspace.reportFields.addField')}
                                                icon={Plus}
                                                style={[styles.sectionMenuItemTopDescription, styles.mt6, styles.mbn3]}
                                            />
                                        </>
                                    )
                                }
                            />
                        </Section>
                    </ScrollView>
                )}
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceReportFieldsPage.displayName = 'WorkspaceReportFieldsPage';

export default WorkspaceReportFieldsPage;
