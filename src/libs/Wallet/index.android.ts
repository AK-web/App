import {addCardToGoogleWallet, checkWalletAvailability, getCardStatusByIdentifier, getSecureWalletInfo} from '@expensify/react-native-wallet';
import type {AndroidCardData, AndroidWalletData, CardStatus} from '@expensify/react-native-wallet';
import {Alert} from 'react-native';
import {openWalletPage} from '@libs/actions/PaymentMethods';
import {createDigitalGoogleWallet} from '@libs/actions/Wallet';
import Log from '@libs/Log';
import CONST from '@src/CONST';
import type {Card} from '@src/types/onyx';

function checkIfWalletIsAvailable(): Promise<boolean> {
    return checkWalletAvailability();
}

function handleAddCardToWallet(card: Card, cardHolderName: string, cardDescription: string, onFinished?: () => void) {
    getSecureWalletInfo()
        .then((walletData: AndroidWalletData) => {
            createDigitalGoogleWallet({cardHolderName, ...walletData})
                .then((cardData: AndroidCardData) => {
                    addCardToGoogleWallet(cardData)
                        .then((status: string) => {
                            Log.info('Card added to wallet');
                            if (status === 'SUCCESS') {
                                openWalletPage();
                            } else {
                                onFinished?.();
                            }
                        })
                        .catch((error) => {
                            Log.warn(`addCardToGoogleWallet error: ${error}`);
                            Alert.alert('Failed to add card to wallet', 'Please try again later.');
                        });
                })

                .catch((error) => Log.warn(`createDigitalWallet error: ${error}`));
        })
        .catch((error) => Log.warn(`getSecureWalletInfo error: ${error}`));
}

function isCardInWallet(card: Card): Promise<boolean> {
    const tokenRefId = card.nameValuePairs?.expensifyCard_tokenReferenceIdList?.at(-1);
    if (!tokenRefId) {
        return Promise.resolve(false);
    }
    return getCardStatusByIdentifier(tokenRefId, CONST.COMPANY_CARDS.CARD_TYPE.VISA)
        .then((status: CardStatus) => {
            Log.info(`Card status: ${status}`);
            return status === 'active';
        })
        .catch((error) => {
            Log.warn(`getCardTokenStatus error: ${error}`);
            return false;
        });
}

export {handleAddCardToWallet, isCardInWallet, checkIfWalletIsAvailable};
