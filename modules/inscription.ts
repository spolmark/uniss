import {Wallet} from "../utils/wallet";

import {asciiToHex, gasChecker, generateRandomWord, getRandomElements, sleep, getProxy} from '../utils/common';
import {fetchFees} from "./fee";
import axios from "axios";
import {configInscription, projectConfig} from "../data/project.config";
import {log} from "../utils/logger";
import {getAuthData, makeAuth, signConverter} from "./unisat";

export async function mintInscriptionModule(wallets: string[]): Promise<void> {
    for (const seed of wallets) {
        const wallet = new Wallet({seed});

        const authData = await getAuthData(wallet.address)
        const sign = wallet.signMessage(authData?.data?.signMsg)

        const status = await makeAuth(wallet.address, wallet.publicKey, sign)
		
        if (status?.msg === "ok") {
            const inscriptionForMint = getRandomElements(configInscription.inscriptionMint, configInscription.quantityMint[0], configInscription.quantityMint[1]);

            for (const inscription of inscriptionForMint) {
                const inscriptionInfo = await getInscriptionInfo(inscription.name);

                if (inscriptionInfo?.data) {
                    const inscriptionName = inscriptionInfo["data"]["ticker"];
                    log("info", `Make mint ${inscription.amount} inscription "${inscriptionName}" | ${wallet.address}`);

                    let result = await createOrderInscription(inscription, wallet.address, inscription.amount);

                    if (result?.data?.payAddress) {
                        await gasChecker();
                        await wallet.makeTransaction(result["data"]["payAddress"], result["data"]["amount"], result["data"]["minerFee"]);
                    } else {
                        log("error", `Mint error: ${result["msg"]} | ${wallet.address}`);
                    }
                } else {
                    log("error", `Inscription ${inscription.name} not found | ${wallet.address}`);
                }
                await sleep(configInscription.sleep);
            }
            await sleep(projectConfig.sleep);
        }
    }
}

export async function deployInscriptionModule(wallets: string[]): Promise<void> {
    for (const seed of wallets) {
        const wallet = new Wallet({seed});

        const inscriptionName = await generateRandomWord(5, 5);

        const authData = await getAuthData(wallet.address)
        const sign = wallet.signMessage(authData?.data?.signMsg)

        const status = await makeAuth(wallet.address, wallet.publicKey, sign)

        if (status?.msg === "ok") {
            const inscriptionInfo = await getInscriptionInfo(inscriptionName);

            if (inscriptionInfo?.data === null) {
                log("info", `Make deploy inscription "${inscriptionName}" | ${wallet.address}`);

                let result = await deployOrderInscription(inscriptionName, wallet.address);

                if (result?.data?.payAddress) {
                    await gasChecker();
                    await wallet.makeTransaction(result["data"]["payAddress"], result["data"]["amount"], result["data"]["minerFee"]);
                } else {
                    log("error", `Deploy error: ${result["msg"]} | ${wallet.address}`);
                }
            } else {
                log("error", `The inscription ${inscriptionName} already exists | ${wallet.address}`);

                await deployInscriptionModule(wallets);
            }
            await sleep(configInscription.sleep);
        }
    }
}

async function getInscriptionInfo(name: string) {
    try {
        const endpoint = `/query-v4/brc20/${asciiToHex(name)}/info`

        const {sign, token, ts} = signConverter(endpoint, '')
		
		let agent = getProxy();
        const response = await axios.get(
            `https://api.unisat.space${endpoint}`,
            {
                headers: {
                    "x-sign": sign,
                    "x-ts": ts,
                    "cf-token": token,
                    "x-appid": "1adcd7969603261753f1812c9461cd36"
                },
				httpsAgent: agent
            }
        );

        return response.data;
    } catch (error) {
        log("error", `Error fetching inscription info: ${(error as Error).message}`);
    }
}

async function createOrderInscription(inscription: any, recipient: string, amount: number): Promise<any> {
    try {
        const currentFee = await fetchFees();
        const code = `{"p":"brc-20","op":"mint","tick":"${inscription.name}","amt":"${amount}"}`;
		
		let agent = getProxy();
        const response = await axios.post(
            "https://api.unisat.space/inscribe-v5/order/create",
            {
                "files": [
                    {
                        "dataURL": `data:text/plain;charset=utf-8;base64,${btoa(code)}`,
                        "filename": code
                    }
                ],
                "receiver": recipient,
                "feeRate": currentFee,
                "outputValue": inscription.price,
                "clientId": ""
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
				httpsAgent: agent
            }
        );

        return response.data;
    } catch (error) {
        log("error", `Error: ${(error as Error).message}`);
    }
}

async function deployOrderInscription(inscription: string, recipient: string): Promise<any> {
    try {
        const currentFee = await fetchFees();

        const code = `{"p":"brc-20","op":"deploy","tick":"${inscription}","lim":"1000","max":"21000000","self_mint":"true"}`;
		let agent = getProxy();
        const response = await axios.post(
            "https://api.unisat.space/inscribe-v5/order/create",
            {
                "files": [
                    {
                        "dataURL": `data:text/plain;charset=utf-8;base64,${btoa(code)}`,
                        "filename": code
                    }
                ],
                "receiver": recipient,
                "feeRate": currentFee,
                "outputValue": configInscription.inscriptionDeployPrice,
                "clientId": ""
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
				httpsAgent: agent
            }
        );

        return response.data;
    } catch (error) {
        log("error", `Error: ${(error as Error).message}`);
    }
}
