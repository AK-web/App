import React, {useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import type {FileObject} from '@components/AttachmentModal';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxKeys, FormOnyxValues} from '@components/Form/types';
import Text from '@components/Text';
import UploadFile from '@components/UploadFile';
import useLocalize from '@hooks/useLocalize';
import useReimbursementAccountStepFormSubmit from '@hooks/useReimbursementAccountStepFormSubmit';
import type {SubStepProps} from '@hooks/useSubStep/types';
import useThemeStyles from '@hooks/useThemeStyles';
import {getFieldRequiredErrors} from '@libs/ValidationUtils';
import getNeededDocumentsStatusForSignerInfo from '@pages/ReimbursementAccount/NonUSD/utils/getNeededDocumentsStatusForSignerInfo';
import WhyLink from '@pages/ReimbursementAccount/NonUSD/WhyLink';
import {clearErrorFields, setDraftValues, setErrorFields} from '@userActions/FormActions';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import Button from '@components/Button';

type UploadDocumentsProps = SubStepProps;

const {ADDRESS_PROOF, PROOF_OF_DIRECTORS, COPY_OF_ID, CODICE_FISCALE, PRD_AND_SFG, SIGNER_PREFIX} = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SIGNER_INFO_DATA;

function UploadDocuments({onNext, isEditing}: UploadDocumentsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const policyID = reimbursementAccount?.achData?.policyID;
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const [downloadPressed, setDownloadPressed] = useState<boolean>(false);

    const currency = policy?.outputCurrency ?? '';
    const countryStepCountryValue = reimbursementAccount?.achData?.[INPUT_IDS.ADDITIONAL_DATA.COUNTRY] ?? '';
    const isDocumentNeededStatus = getNeededDocumentsStatusForSignerInfo(currency, countryStepCountryValue);

    const copyOfIDInputID = `${SIGNER_PREFIX}_${COPY_OF_ID}` as const;
    const addressProofInputID = `${SIGNER_PREFIX}_${ADDRESS_PROOF}` as const;
    const directorsProofInputID = `${SIGNER_PREFIX}_${PROOF_OF_DIRECTORS}` as const;
    const codiceFiscaleInputID = `${SIGNER_PREFIX}_${CODICE_FISCALE}` as const;

    const defaultValues: Record<string, FileObject[]> = {
        [copyOfIDInputID]: Array.isArray(reimbursementAccountDraft?.[copyOfIDInputID]) ? reimbursementAccountDraft?.[copyOfIDInputID] : [],
        [addressProofInputID]: Array.isArray(reimbursementAccountDraft?.[addressProofInputID]) ? reimbursementAccountDraft?.[addressProofInputID] : [],
        [directorsProofInputID]: Array.isArray(reimbursementAccountDraft?.[directorsProofInputID]) ? reimbursementAccountDraft?.[directorsProofInputID] : [],
        [codiceFiscaleInputID]: Array.isArray(reimbursementAccountDraft?.[codiceFiscaleInputID]) ? reimbursementAccountDraft?.[codiceFiscaleInputID] : [],
    };

    const [uploadedIDs, setUploadedID] = useState<FileObject[]>(defaultValues[copyOfIDInputID]);
    const [uploadedProofsOfAddress, setUploadedProofOfAddress] = useState<FileObject[]>(defaultValues[addressProofInputID]);
    const [uploadedProofsOfDirectors, setUploadedProofsOfDirectors] = useState<FileObject[]>(defaultValues[directorsProofInputID]);
    const [uploadedCodiceFiscale, setUploadedCodiceFiscale] = useState<FileObject[]>(defaultValues[codiceFiscaleInputID]);

    const STEP_FIELDS = useMemo(
        (): Array<FormOnyxKeys<'reimbursementAccount'>> => [copyOfIDInputID, addressProofInputID, directorsProofInputID, codiceFiscaleInputID],
        [copyOfIDInputID, addressProofInputID, directorsProofInputID, codiceFiscaleInputID],
    );

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM> => {
            return getFieldRequiredErrors(values, STEP_FIELDS);
        },
        [STEP_FIELDS],
    );

    const handleSubmit = useReimbursementAccountStepFormSubmit({
        fieldIds: STEP_FIELDS,
        onNext,
        shouldSaveDraft: isEditing,
    });

    const handleRemoveFile = (fileName: string, uploadedFiles: FileObject[], inputID: string, setFiles: React.Dispatch<React.SetStateAction<FileObject[]>>) => {
        const newUploadedIDs = uploadedFiles.filter((file) => file.name !== fileName);
        setDraftValues(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM, {[inputID]: newUploadedIDs});
        setFiles(newUploadedIDs);
    };

    const handleSelectFile = (files: FileObject[], uploadedFiles: FileObject[], inputID: string, setFiles: React.Dispatch<React.SetStateAction<FileObject[]>>) => {
        setDraftValues(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM, {[inputID]: [...uploadedFiles, ...files]});
        setFiles((prev) => [...prev, ...files]);
    };

    const setUploadError = (error: string, inputID: string) => {
        if (!error) {
            clearErrorFields(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM);
            return;
        }

        setErrorFields(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM, {[inputID]: {onUpload: error}});
    };

    const handleDownloadPress = () => {
        // TODO: perform file download
        setDownloadPressed(true);
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            onSubmit={handleSubmit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            submitButtonStyles={[styles.mb0]}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb5]}>{translate('ownershipInfoStep.uploadDocuments')}</Text>
            <Text style={[styles.textSupporting, styles.mb5]}>{translate('signerInfoStep.pleaseUpload')}</Text>
            <Text style={[styles.textSupporting, styles.mb6]}>{translate('ownershipInfoStep.acceptedFiles')}</Text>
            {isDocumentNeededStatus.isCopyOfIDNeeded && (
                <View>
                    <Text style={[styles.mutedTextLabel, styles.mb3]}>{translate('signerInfoStep.id')}</Text>
                    <InputWrapper
                        InputComponent={UploadFile}
                        buttonText={translate('signerInfoStep.chooseFile')}
                        uploadedFiles={uploadedIDs}
                        onUpload={(files) => {
                            handleSelectFile(files, uploadedIDs, `${SIGNER_PREFIX}_${COPY_OF_ID}`, setUploadedID);
                        }}
                        onRemove={(fileName) => {
                            handleRemoveFile(fileName, uploadedIDs, `${SIGNER_PREFIX}_${COPY_OF_ID}`, setUploadedID);
                        }}
                        acceptedFileTypes={[...CONST.NON_USD_BANK_ACCOUNT.ALLOWED_FILE_TYPES]}
                        value={uploadedIDs}
                        inputID={`${SIGNER_PREFIX}_${COPY_OF_ID}`}
                        setError={(error) => {
                            setUploadError(error, `${SIGNER_PREFIX}_${COPY_OF_ID}`);
                        }}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mt6]}>{translate('ownershipInfoStep.copyOfIDDescription')}</Text>
                    {(isDocumentNeededStatus.isAddressProofNeeded ||
                        isDocumentNeededStatus.isProofOfDirecorsNeeded ||
                        isDocumentNeededStatus.isCodiceFiscaleNeeded ||
                        isDocumentNeededStatus.isPRDandFSGNeeded) && <View style={[styles.sectionDividerLine, styles.mt6, styles.mb6]} />}
                </View>
            )}
            {isDocumentNeededStatus.isAddressProofNeeded && (
                <View>
                    <Text style={[styles.mutedTextLabel, styles.mb3]}>{translate('signerInfoStep.proofOf')}</Text>
                    <InputWrapper
                        InputComponent={UploadFile}
                        buttonText={translate('signerInfoStep.chooseFile')}
                        uploadedFiles={uploadedProofsOfAddress}
                        onUpload={(files) => {
                            handleSelectFile(files, uploadedProofsOfAddress, `${SIGNER_PREFIX}_${ADDRESS_PROOF}`, setUploadedProofOfAddress);
                        }}
                        onRemove={(fileName) => {
                            handleRemoveFile(fileName, uploadedProofsOfAddress, `${SIGNER_PREFIX}_${ADDRESS_PROOF}`, setUploadedProofOfAddress);
                        }}
                        acceptedFileTypes={[...CONST.NON_USD_BANK_ACCOUNT.ALLOWED_FILE_TYPES]}
                        value={uploadedProofsOfAddress}
                        inputID={`${SIGNER_PREFIX}_${ADDRESS_PROOF}`}
                        setError={(error) => {
                            setUploadError(error, `${SIGNER_PREFIX}_${ADDRESS_PROOF}`);
                        }}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mt6]}>{translate('ownershipInfoStep.proofOfAddressDescription')}</Text>
                    {(isDocumentNeededStatus.isProofOfDirecorsNeeded || isDocumentNeededStatus.isCodiceFiscaleNeeded || isDocumentNeededStatus.isPRDandFSGNeeded) && (
                        <View style={[styles.sectionDividerLine, styles.mt6, styles.mb6]} />
                    )}
                </View>
            )}
            {isDocumentNeededStatus.isProofOfDirecorsNeeded && (
                <View>
                    <Text style={[styles.mutedTextLabel, styles.mb3]}>{translate('signerInfoStep.proofOfDirectors')}</Text>
                    <InputWrapper
                        InputComponent={UploadFile}
                        buttonText={translate('signerInfoStep.chooseFile')}
                        uploadedFiles={uploadedProofsOfDirectors}
                        onUpload={(files) => {
                            handleSelectFile(files, uploadedProofsOfDirectors, `${SIGNER_PREFIX}_${PROOF_OF_DIRECTORS}`, setUploadedProofsOfDirectors);
                        }}
                        onRemove={(fileName) => {
                            handleRemoveFile(fileName, uploadedProofsOfDirectors, `${SIGNER_PREFIX}_${PROOF_OF_DIRECTORS}`, setUploadedProofsOfDirectors);
                        }}
                        acceptedFileTypes={[...CONST.NON_USD_BANK_ACCOUNT.ALLOWED_FILE_TYPES]}
                        value={uploadedProofsOfDirectors}
                        inputID={`${SIGNER_PREFIX}_${PROOF_OF_DIRECTORS}`}
                        setError={(error) => {
                            setUploadError(error, `${SIGNER_PREFIX}_${PROOF_OF_DIRECTORS}`);
                        }}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mt6]}>{translate('signerInfoStep.proofOfDirectorsDescription')}</Text>
                    {(isDocumentNeededStatus.isCodiceFiscaleNeeded || isDocumentNeededStatus.isPRDandFSGNeeded) && <View style={[styles.sectionDividerLine, styles.mt6, styles.mb6]} />}
                </View>
            )}
            {isDocumentNeededStatus.isCodiceFiscaleNeeded && (
                <View>
                    <Text style={[styles.mutedTextLabel, styles.mb3]}>{translate('signerInfoStep.codiceFiscale')}</Text>
                    <InputWrapper
                        InputComponent={UploadFile}
                        buttonText={translate('signerInfoStep.chooseFile')}
                        uploadedFiles={uploadedCodiceFiscale}
                        onUpload={(files) => {
                            handleSelectFile(files, uploadedCodiceFiscale, `${SIGNER_PREFIX}_${CODICE_FISCALE}`, setUploadedCodiceFiscale);
                        }}
                        onRemove={(fileName) => {
                            handleRemoveFile(fileName, uploadedCodiceFiscale, `${SIGNER_PREFIX}_${CODICE_FISCALE}`, setUploadedCodiceFiscale);
                        }}
                        acceptedFileTypes={[...CONST.NON_USD_BANK_ACCOUNT.ALLOWED_FILE_TYPES]}
                        value={uploadedCodiceFiscale}
                        inputID={`${SIGNER_PREFIX}_${CODICE_FISCALE}`}
                        setError={(error) => {
                            setUploadError(error, `${SIGNER_PREFIX}_${CODICE_FISCALE}`);
                        }}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mt6]}>{translate('signerInfoStep.codiceFiscaleDescription')}</Text>
                    {isDocumentNeededStatus.isPRDandFSGNeeded && <View style={[styles.sectionDividerLine, styles.mt6, styles.mb6]} />}
                </View>
            )}
            {isDocumentNeededStatus.isPRDandFSGNeeded && (
                <View style={styles.alignItemsStart}>
                    <Text style={[styles.mutedTextLabel, styles.mb3]}>{translate('signerInfoStep.PDSandFSG')}</Text>
                    <Button
                        medium
                        text={translate('common.download')}
                        onPress={handleDownloadPress}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mb3, styles.mt6]}>{translate('signerInfoStep.PDSandFSGDescription')}</Text>
                </View>
            )}
            <WhyLink containerStyles={[styles.mt6]} />
        </FormProvider>
    );
}

UploadDocuments.displayName = 'UploadDocuments';

export default UploadDocuments;
