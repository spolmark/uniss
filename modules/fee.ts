import axios from "axios";
import {getProxy} from '../utils/common';
import { projectConfig } from "../data/project.config";
import {log} from "../utils/logger";

export async function fetchFees(): Promise<number | undefined> {
    try {
		let agent = getProxy();
        const response = await axios.get('https://mempool.space/api/v1/fees/recommended', {httpsAgent: agent});

        const fee = projectConfig.feesUsing;

        const acceptFees: { [key: string]: string } = {
            "slow": "minimumFee",
            "medium": "economyFee",
            "fast": "fastestFee",
        };

        return response.data[acceptFees[fee]];
    } catch (error) {
        log("error", `Error fetching recommended fees: ${(error as Error).message}`);
    }
}
