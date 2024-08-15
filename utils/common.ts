import * as fs from 'fs';
import {select} from "@inquirer/prompts";
import {fetchFees} from "../modules/fee";
import {projectConfig} from "../data/project.config";
import axios from "axios";
import {log} from "./logger";
import {createHash} from "crypto";

import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

export function getProxy() {
    let agent
    let proxy = projectConfig.mobile_proxy

    if (proxy) {
        if (proxy.includes("http")) {
            agent = new HttpsProxyAgent(proxy)
        }

        if (proxy.includes("socks")) {
            agent = new SocksProxyAgent(proxy)
        }
    }

    return agent
}

export async function menu() {
    console.log("❤️ Subscribe to me – https://t.me/sybilwave\n");

    const answer = await select(
        {
            message: "💎 Select a method to get started",
            choices: [
                {
                    name: "1) Mint inscription on Unisat",
                    value: "mint_inscription_unisat",
                },
                {
                    name: "2) Deploy inscription on Unisat",
                    value: "deploy_inscription_unisat",
                },
                {
                    name: "3) Mint rune on Unisat",
                    value: "mint_rune_unisat",
                },
                {
                    name: "4) Deploy rune on Unisat",
                    value: "deploy_rune_unisat",
                },
                {
                    name: "5) Exit",
                    value: "exit",
                },
            ],
        }
    );

    return answer;
}

export function readWallets(filePath: string): string[] {
    try {
        const file = fs.readFileSync(filePath, 'utf-8');
        return file.split('\n').map(line => line.trim()).filter(line => line);
    } catch (error) {
        log("error", `Error reading the file: ${(error as Error).message}`);
        return [];
    }
}

export function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33);
}

export function getRandomElements(arr: any, min: number, max: number) {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;

    const result = [];

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * arr.length);
        result.push(arr[randomIndex]);
    }

    return result;
}

export async function sleep(seconds: number[]): Promise<void> {
    const sleep_seconds = Math.floor(Math.random() * (seconds[1] - seconds[0] + 1)) + seconds[0];

    return new Promise((resolve) => {
        const interval = 100; // Интервал обновления прогрессбара в миллисекундах
        let elapsed = 0;
        const totalIntervals = (sleep_seconds * 1000) / interval;

        const timer = setInterval(() => {
            elapsed += 1;
            const progress = Math.min((elapsed / totalIntervals) * 100, 100);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`💤 Sleep ${sleep_seconds} seconds: [${'='.repeat(progress / 5)}${' '.repeat(20 - progress / 5)}] ${progress.toFixed(2)}%`);

            if (elapsed >= totalIntervals) {
                clearInterval(timer);
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                resolve();
            }
        }, interval);
    });
}

export async function generateRandomWord(minLength: number, maxLength: number): Promise<string> {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const wordLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    return new Promise((resolve) => {
        const randomWord = Array.from({length: wordLength}, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        resolve(randomWord);
    });
}

export async function generateRandomNumberString(minLength: number, maxLength: number): Promise<string> {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

    return new Promise((resolve) => {
        const randomNumberString = Array.from({length}, () => Math.floor(Math.random() * 10).toString()).join('');
        resolve(randomNumberString);
    });
}

export async function gasChecker(): Promise<void> {
    const getDelay = () => {
        const seconds = projectConfig.gasCheckerSleep;

        return Math.floor(Math.random() * (seconds[1] - seconds[0] + 1)) + seconds[0];
    }

    const checkFee = async (delay: number): Promise<boolean> => {
        const currentFee = await fetchFees();

        if (currentFee === undefined) {
            log("error", "Failed to fetch current fee.");
            return false;
        }

        const isSuccess = currentFee < projectConfig.maxGas;

        log("info", `Current gas ${isSuccess ? `is normal | ${currentFee}` : `${currentFee} > ${projectConfig.maxGas} | Sleep ${delay} s.`}`);

        return isSuccess;
    };

    return new Promise((resolve) => {
        let delay = getDelay()

        const checkAndResolve = async () => {
            delay = getDelay()

            if (await checkFee(delay)) {
                resolve();
                clearInterval(intervalId);
            }
        };

        checkAndResolve();

        const intervalId = setInterval(checkAndResolve, delay * 1000); // Повтор через 30 секунд
    });
}

export async function getBalance(address: string): Promise<any> {
    try {
		let agent = getProxy();
        const response = await axios.get(`https://mempool.space/api/address/${address}`, {httpsAgent: agent});

        return response.data;
    } catch (error) {
        log("error", `Error fetching balance: ${(error as Error).message} | ${address}`);
        await getBalance(address)
    }
}

export async function mempoolChecker(address: string): Promise<any> {
    log('info', `Check mempool at this address: ${address}`);

    const checkBalance = async (): Promise<boolean> => {
        const userBalance = await getBalance(address);
        const isEmpty = userBalance?.mempool_stats?.funded_txo_count === 0;
        log('info', `User mempool ${isEmpty ? `is empty! | ${address}` : `is not empty! Sleep 30s. | ${address}`}`);
        return isEmpty;
    };

    return new Promise<any>((resolve) => {
        const checkAndResolve = async () => {
            if (await checkBalance()) {
                resolve(await getBalance(address));
                clearInterval(intervalId);
            }
        };

        checkAndResolve();

        const intervalId = setInterval(checkAndResolve, 30000); // Повтор через 30 секунд
    });
}

export function randomString(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function asciiToHex(asciiString: string): string {
    let hexString = '';
    for (let i = 0; i < asciiString.length; i++) {
        const hex = asciiString.charCodeAt(i).toString(16);
        hexString += hex;
    }
    return hexString;
}
