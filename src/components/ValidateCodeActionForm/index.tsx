import React, {forwardRef, useEffect, useRef} from 'react';
import {useOnyx} from 'react-native-onyx';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import ValidateCodeForm from '@components/ValidateCodeActionModal/ValidateCodeForm';
import type {ValidateCodeFormHandle} from '@components/ValidateCodeActionModal/ValidateCodeForm/BaseValidateCodeForm';
import useThemeStyles from '@hooks/useThemeStyles';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ValidateCodeActionFormProps} from './type';

function ValidateCodeActionForm({
    descriptionPrimary,
    descriptionSecondary,
    validatePendingAction,
    validateError,
    handleSubmitForm,
    clearError,
    sendValidateCode,
    hasMagicCodeBeenSent,
    isLoading,
    submitButtonText,
    forwardedRef,
    shouldSkipInitialValidation,
}: ValidateCodeActionFormProps) {
    const themeStyles = useThemeStyles();

    const [validateCodeAction] = useOnyx(ONYXKEYS.VALIDATE_ACTION_CODE);

    const isUnmounted = useRef(false);

    useEffect(() => {
        if (!shouldSkipInitialValidation) {
            sendValidateCode();
        }

        return () => {
            isUnmounted.current = true;
        };
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [shouldSkipInitialValidation]);

    useEffect(() => {
        return () => {
            if (!isUnmounted.current) {
                return;
            }
            clearError();
        };
    }, [clearError]);

    return (
        <ScrollView
            style={[themeStyles.w100, themeStyles.h100, themeStyles.flex1]}
            contentContainerStyle={[themeStyles.flexGrow1, themeStyles.ph5, themeStyles.mt3, themeStyles.mb5]}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={[themeStyles.mb6]}>{descriptionPrimary}</Text>
            {!!descriptionSecondary && <Text style={[themeStyles.mb6]}>{descriptionSecondary}</Text>}
            <ValidateCodeForm
                isLoading={isLoading}
                validateCodeAction={validateCodeAction}
                validatePendingAction={validatePendingAction}
                validateError={validateError}
                handleSubmitForm={handleSubmitForm}
                sendValidateCode={sendValidateCode}
                clearError={clearError}
                buttonStyles={[themeStyles.justifyContentEnd, themeStyles.flex1]}
                ref={forwardedRef}
                hasMagicCodeBeenSent={hasMagicCodeBeenSent}
                submitButtonText={submitButtonText}
            />
        </ScrollView>
    );
}

ValidateCodeActionForm.displayName = 'ValidateCodeActionForm';

export default forwardRef<ValidateCodeFormHandle, ValidateCodeActionFormProps>((props, ref) => (
    <ValidateCodeActionForm
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        forwardedRef={ref}
    />
));
