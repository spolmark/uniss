import {createHash} from "crypto";
import {randomString, getProxy} from "../utils/common"
import axios from "axios";
import {log} from "../utils/logger";

export function signConverter(endpoint: string, body: any) {
    const ts = Math.floor(Date.now() / 1e3);

    const query = `${endpoint}\n${body}\n${ts}@#?.#@deda5ddd2b3d84988b2cb0a207c4674e`;

    const sign = createHash('md5').update(query).digest('hex');

    const token = (
        randomString(6) + sign.substring(12, 14) +
        randomString(8) + 'u' +
        randomString(8)
    );

    return {sign, token, ts}

}

export async function getAuthData(address: string) {
    const endpoint = `/basic-v4/base/preload?address=${address}`

    const {sign, token, ts} = signConverter(endpoint, '')

    try {
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
        log("error", `Error fetching recommended fees: ${(error as Error).message}`);
    }
}

export async function makeAuth(address: string, publicKey: string, signMsg: string) {
    const endpoint = "/basic-v4/base/login"

    const body = {
        "address": address,
        "pubkey": publicKey,
        "sign": signMsg,
        "walletType": "unisat"
    }

    const {sign, token, ts} = signConverter(endpoint, JSON.stringify(body))

    try {
        log("info", `Try authorize wallet on Unisat | ${address}`)
		let agent = getProxy();
        const response = await axios.post(
            `https://api.unisat.space${endpoint}`,
            body,
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

        return response.data
    } catch (error) {
        log("error", `Error authorize wallet on Unisat: ${(error as Error).message} | ${address}`);
    }
}

