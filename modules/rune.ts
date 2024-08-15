import {Wallet} from "../utils/wallet";

import {
    gasChecker,
    generateRandomNumberString,
    generateRandomWord,
    getRandomElements,
    sleep,
	getProxy,
} from '../utils/common';
import {fetchFees} from "./fee";
import axios from "axios";
import {configRunes, projectConfig} from "../data/project.config";
import {log} from "../utils/logger";
import {getAuthData, makeAuth} from "./unisat";

export async function mintRuneModule(wallets: string[]): Promise<void> {
    for (const seed of wallets) {
        const wallet = new Wallet({seed});

        const authData = await getAuthData(wallet.address)
        const sign = wallet.signMessage(authData?.data?.signMsg)

        const status = await makeAuth(wallet.address, wallet.publicKey, sign)

        if (status?.msg === "ok") {
            const runesForMint = getRandomElements(configRunes.runesMint, configRunes.quantityRunesMint[0], configRunes.quantityRunesMint[1]);

            for (const rune of runesForMint) {
                const runeInfo = await getRuneInfo(rune.runeID);

                if (runeInfo?.data) {
                    const runeName = runeInfo["data"]["rune"];
                    log("info", `Make mint ${rune.count} rune "${runeName}" | ${wallet.address}`);

                    let result = await createOrderRune(rune, wallet.address);

                    if (result?.data?.payAddress) {
                        await gasChecker();
                        await wallet.makeTransaction(result["data"]["payAddress"], result["data"]["amount"], result["data"]["minerFee"]);
                    } else {
                        log("error", `Mint error: ${result["msg"]} | ${wallet.address}`);
                    }
                } else {
                    log("error", `Rune ${rune.runeID} not found | ${wallet.address}`);
                }
                await sleep(configRunes.sleep);
            }
            await sleep(projectConfig.sleep);
        }
    }
}

export async function deployRuneModule(wallets: string[]): Promise<void> {
    for (const seed of wallets) {
        const wallet = new Wallet({seed});

        const runeName = await generateRandomWord(12, 20);

        const authData = await getAuthData(wallet.address)
        const sign = wallet.signMessage(authData?.data?.signMsg)

        const status = await makeAuth(wallet.address, wallet.publicKey, sign)

        if (status?.msg === "ok") {
            const runeInfo = await getRuneInfo(runeName);

            if (runeInfo?.data == null) {
                log("info", `Make deploy rune "${runeName}" | ${wallet.address}`);

                let result = await deployOrderRune(runeName, wallet.address);

                if (result?.data?.payAddress) {
                    await gasChecker();
                    await wallet.makeTransaction(result["data"]["payAddress"], result["data"]["amount"], result["data"]["minerFee"]);
                } else {
                    log("error", `Deploy error: ${result["msg"]} | ${wallet.address}`);
                }
            } else {
                log("error", `The rune ${runeName} already exists | ${wallet.address}`);

                await deployRuneModule(wallets);
            }
            await sleep(configRunes.sleep);
        }
    }
}

async function getRuneInfo(runeID: string) {
    try {
		let agent = getProxy();
        const response = await axios.get(`https://api.unisat.space/query-v4/runes/${runeID}/info`, {httpsAgent: agent});

        return response.data;
    } catch (error) {
        log("error", `Error fetching rune info: ${(error as Error).message}`);
    }
}

async function createOrderRune(rune: any, recipient: string): Promise<any> {
    try {
        const currentFee = await fetchFees();
		let agent = getProxy();
        const response = await axios.post(
            "https://api.unisat.space/inscribe-v5/order/create/runes-mint",
            {
                "receiver": recipient,
                "feeRate": currentFee,
                "outputValue": rune.price,
                "runeId": rune.runeID,
                "count": rune.count,
                "clientId": "",
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
				httpsAgent: agent
            }
        );

        return response.data;
    } catch (error) {
        log("error", `Error: ${(error as Error).message}`);
    }
}

async function deployOrderRune(rune: string, recipient: string): Promise<any> {
    try {
        const currentFee = await fetchFees();
		let agent = getProxy();
        const response = await axios.post(
            "https://api.unisat.space/inscribe-v5/order/create/runes-etch",
            {
                "receiver": recipient,
                "feeRate": currentFee,
                "outputValue": configRunes.runeDeployPrice,
                "files": [
                    {
                        "runes_etch": {
                            "etching": {
                                "spacedRune": rune,
                                "premine": "",
                                "symbol": "",
                                "terms": {
                                    "amount": "1",
                                    "cap": await generateRandomNumberString(8, 13),
                                    "height": [
                                        null,
                                        null,
                                    ],
                                    "offset": [
                                        null,
                                        null,
                                    ]
                                }
                            }
                        }
                    }
                ],
                "clientId": "",
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
				httpsAgent: agent
            }
        );

        return response.data;
    } catch (error) {
        log("error", `Error: ${(error as Error).message}`);
    }
}
