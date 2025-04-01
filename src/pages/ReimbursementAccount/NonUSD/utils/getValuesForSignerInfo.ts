import type {OnyxEntry} from 'react-native-onyx';
import type {FileObject} from '@components/AttachmentModal';
import CONST from '@src/CONST';
import type {ReimbursementAccountForm} from '@src/types/form';

type SignerInfoDirector = {
    directorID: string;
    fullName: string;
    jobTitle: string;
    occupation: string;
    proofOfDirectors: FileObject[];
    copyOfId: FileObject[];
    addressProof: FileObject[];
    codiceFisclaleTaxID: FileObject[];
    PRDandFSG: FileObject[];
};

type SignerInfoValues = {
    dateOfBirth: string;
    fullName: string;
    jobTitle: string;
    city: string;
    state: string;
    street: string;
    zipCode: string;
    directors: SignerInfoDirector[];
};

function getValuesForSignerInfo(directorIDs: string[], reimbursementAccountDraft: OnyxEntry<ReimbursementAccountForm>): SignerInfoValues {
    if (!reimbursementAccountDraft) {
        return {
            dateOfBirth: '',
            fullName: '',
            jobTitle: '',
            city: '',
            state: '',
            street: '',
            zipCode: '',
            directors: [],
        };
    }

    const directorsPrefix = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SIGNER_INFO_DATA.DIRECTOR_PREFIX;
    const signerInfoKeys = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SIGNER_INFO_DATA;

    return {
        dateOfBirth: reimbursementAccountDraft[signerInfoKeys.DATE_OF_BIRTH] ?? '',
        fullName: reimbursementAccountDraft[signerInfoKeys.FULL_NAME] ?? '',
        jobTitle: reimbursementAccountDraft[signerInfoKeys.JOB_TITLE] ?? '',
        city: reimbursementAccountDraft[signerInfoKeys.CITY] ?? '',
        state: reimbursementAccountDraft[signerInfoKeys.STATE] ?? '',
        street: reimbursementAccountDraft[signerInfoKeys.STREET] ?? '',
        zipCode: reimbursementAccountDraft[signerInfoKeys.ZIP_CODE] ?? '',
        directors: directorIDs.map(
            (directorID) =>
                ({
                    directorID,
                    fullName: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.DIRECTOR_FULL_NAME}`] ?? '',
                    jobTitle: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.DIRECTOR_JOB_TITLE}`] ?? '',
                    occupation: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.DIRECTOR_OCCUPATION}`] ?? '',
                    proofOfDirectors: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.PROOF_OF_DIRECTORS}`] ?? [],
                    copyOfId: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.COPY_OF_ID}`] ?? [],
                    addressProof: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.ADDRESS_PROOF}`] ?? [],
                    codiceFisclaleTaxID: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.CODICE_FISCALE}`] ?? [],
                    PRDandFSG: reimbursementAccountDraft[`${directorsPrefix}_${directorID}_${signerInfoKeys.PRD_AND_SFG}`] ?? [],
                } as SignerInfoDirector),
        ),
    } as SignerInfoValues;
}

export default getValuesForSignerInfo;
