import React from 'react';
import {View} from 'react-native';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ONYXKEYS from '@src/ONYXKEYS';
import CONST from '@src/CONST';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import INPUT_IDS from '@src/types/form/MoneyRequestRejectReasonForm';

type RejectReasonFormViewProps = {
    backTo?: string;
    onSubmit: (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_REJECT_FORM>) => void;
    validate: (values: FormOnyxValues<typeof ONYXKEYS.FORMS.MONEY_REQUEST_REJECT_FORM>) => Partial<Record<'comment', string | undefined>>;
};

function RejectReasonFormView({backTo, validate, onSubmit}: RejectReasonFormViewProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <View style={[styles.flex1, styles.mt3, styles.mh5]}>
            <FormProvider
                formID="moneyRejectReasonForm"
                submitButtonText={translate('common.submit')}
                style={[styles.flexGrow1]}
                onSubmit={onSubmit}
                validate={validate}
                enabledWhenOffline
            >
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.COMMENT}
                    name={INPUT_IDS.COMMENT}
                    label={translate('common.comment')}
                    accessibilityLabel={translate('common.comment')}
                    role={CONST.ROLE.PRESENTATION}
                    autoGrowHeight
                    textAlignVertical="top"
                    shouldSaveDraft
                />
            </FormProvider>
        </View>
    );
}

RejectReasonFormView.displayName = 'RejectReasonFormView';

export default RejectReasonFormView;
